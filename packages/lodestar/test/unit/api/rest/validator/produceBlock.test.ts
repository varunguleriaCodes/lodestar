import {toHexString} from "@chainsafe/ssz";
import {expect} from "chai";
import supertest from "supertest";
import {produceBlockController} from "../../../../../src/api/rest/controllers/validator/produceBlock";
import {generateEmptyBlock} from "../../../../utils/block";
import {urlJoin} from "../utils";
import {VALIDATOR_PREFIX} from "../index.test";
import {SinonStubbedInstance} from "sinon";
import {RestApi, ValidatorApi} from "../../../../../src/api";

describe("rest - validator - produceBlock", function () {
  let restApi: RestApi;
  let validatorStub: SinonStubbedInstance<ValidatorApi>;

  beforeEach(function () {
    validatorStub = this.test?.ctx?.validatorStub;
    restApi = this.test?.ctx?.restApi;
  });

  it("should succeed", async function () {
    validatorStub.produceBlock.resolves(generateEmptyBlock());
    const response = await supertest(restApi.server.server)
      .get(urlJoin(VALIDATOR_PREFIX, produceBlockController.url.replace(":slot", "5")))
      .query({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        randao_reveal: toHexString(Buffer.alloc(32, 1)),
        graffiti: "0x2123",
      })
      .expect(200)
      .expect("Content-Type", "application/json; charset=utf-8");
    expect(response.body.data).to.not.be.undefined;
    expect(validatorStub.produceBlock.withArgs(5, Buffer.alloc(32, 1), "0x2123"));
  });

  it("missing randao reveal", async function () {
    await supertest(restApi.server.server)
      .get(urlJoin(VALIDATOR_PREFIX, produceBlockController.url.replace(":slot", "5")))
      .expect(400)
      .expect("Content-Type", "application/json; charset=utf-8");
  });

  it("invalid slot", async function () {
    await supertest(restApi.server.server)
      .get(urlJoin(VALIDATOR_PREFIX, produceBlockController.url.replace(":slot", "0")))
      .query({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        randao_reveal: toHexString(Buffer.alloc(32, 1)),
      })
      .expect(400)
      .expect("Content-Type", "application/json; charset=utf-8");
  });
});
