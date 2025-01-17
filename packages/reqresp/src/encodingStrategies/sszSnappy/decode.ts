import {decode as varintDecode, encodingLength as varintEncodingLength} from "uint8-varint";
import {Uint8ArrayList} from "uint8arraylist";
import {TypeSizes} from "../../types.js";
import {BufferedSource} from "../../utils/index.js";
import {SszSnappyError, SszSnappyErrorCode} from "./errors.js";
import {SnappyFramesUncompress} from "./snappyFrames/uncompress.js";
import {maxEncodedLen} from "./utils.js";

export const MAX_VARINT_BYTES = 10;

/**
 * ssz_snappy encoding strategy reader.
 * Consumes a stream source to read encoded header and payload as defined in the spec:
 * ```bnf
 * <encoding-dependent-header> | <encoded-payload>
 * ```
 */
export async function readSszSnappyPayload(bufferedSource: BufferedSource, type: TypeSizes): Promise<Uint8Array> {
  const sszDataLength = await readSszSnappyHeader(bufferedSource, type);

  return readSszSnappyBody(bufferedSource, sszDataLength);
}

/**
 * Reads `<encoding-dependent-header>` for ssz-snappy.
 * encoding-header ::= the length of the raw SSZ bytes, encoded as an unsigned protobuf varint
 */
export async function readSszSnappyHeader(bufferedSource: BufferedSource, type: TypeSizes): Promise<number> {
  for await (const buffer of bufferedSource) {
    // Get next bytes if empty
    if (buffer.length === 0) {
      continue;
    }

    let sszDataLength: number;
    try {
      sszDataLength = varintDecode(buffer.subarray());
    } catch (_e) {
      throw new SszSnappyError({code: SszSnappyErrorCode.INVALID_VARINT_BYTES_COUNT, bytes: Infinity});
    }

    // MUST validate: the unsigned protobuf varint used for the length-prefix MUST not be longer than 10 bytes
    // encodingLength function only returns 1-8 inclusive
    const varintBytes = varintEncodingLength(sszDataLength);
    buffer.consume(varintBytes);

    // MUST validate: the length-prefix is within the expected size bounds derived from the payload SSZ type.
    const minSize = type.minSize;
    const maxSize = type.maxSize;
    if (sszDataLength < minSize) {
      throw new SszSnappyError({code: SszSnappyErrorCode.UNDER_SSZ_MIN_SIZE, minSize, sszDataLength});
    }
    if (sszDataLength > maxSize) {
      throw new SszSnappyError({code: SszSnappyErrorCode.OVER_SSZ_MAX_SIZE, maxSize, sszDataLength});
    }

    return sszDataLength;
  }

  throw new SszSnappyError({code: SszSnappyErrorCode.SOURCE_ABORTED});
}

/**
 * Reads `<encoded-payload>` for ssz-snappy and decompress.
 * The returned bytes can be SSZ deseralized
 */
export async function readSszSnappyBody(bufferedSource: BufferedSource, sszDataLength: number): Promise<Uint8Array> {
  const decompressor = new SnappyFramesUncompress();
  const uncompressedData = new Uint8ArrayList();
  let readBytes = 0;

  for await (const buffer of bufferedSource) {
    // SHOULD NOT read more than max_encoded_len(n) bytes after reading the SSZ length-prefix n from the header
    readBytes += buffer.length;
    if (readBytes > maxEncodedLen(sszDataLength)) {
      throw new SszSnappyError({code: SszSnappyErrorCode.TOO_MUCH_BYTES_READ, readBytes, sszDataLength});
    }

    // No bytes left to consume, get next
    if (buffer.length === 0) {
      continue;
    }

    // stream contents can be passed through a buffered Snappy reader to decompress frame by frame
    try {
      const uncompressed = decompressor.uncompress(buffer);
      buffer.consume(buffer.length);
      if (uncompressed !== null) {
        uncompressedData.append(uncompressed);
      }
    } catch (e) {
      throw new SszSnappyError({code: SszSnappyErrorCode.DECOMPRESSOR_ERROR, decompressorError: e as Error});
    }

    // SHOULD consider invalid reading more bytes than `n` SSZ bytes
    if (uncompressedData.length > sszDataLength) {
      throw new SszSnappyError({code: SszSnappyErrorCode.TOO_MANY_BYTES, sszDataLength});
    }

    // Keep reading chunks until `n` SSZ bytes
    if (uncompressedData.length < sszDataLength) {
      continue;
    }

    // buffer.length === n
    return uncompressedData.subarray(0, sszDataLength);
  }

  // SHOULD consider invalid: An early EOF before fully reading the declared length-prefix worth of SSZ bytes
  throw new SszSnappyError({code: SszSnappyErrorCode.SOURCE_ABORTED});
}
