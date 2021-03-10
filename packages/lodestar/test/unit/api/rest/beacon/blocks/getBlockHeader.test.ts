import {expect} from "chai";
import supertest from "supertest";
import {getBlockHeader} from "../../../../../../src/api/rest/controllers/beacon/blocks";
import {generateSignedBeaconHeaderResponse} from "../../../../../utils/api";
import {urlJoin} from "../../utils";
import {BEACON_PREFIX} from "../../index.test";
import {SinonStubbedInstance} from "sinon";
import {RestApi} from "../../../../../../src/api";
import {BeaconBlockApi} from "../../../../../../src/api/impl/beacon/blocks";

describe("rest - beacon - getBlockHeader", function () {
  let beaconBlocksStub: SinonStubbedInstance<BeaconBlockApi>;
  let restApi: RestApi;

  beforeEach(function () {
    beaconBlocksStub = this.test?.ctx?.beaconBlocksStub;
    restApi = this.test?.ctx?.restApi;
  });

  it("should succeed", async function () {
    beaconBlocksStub.getBlockHeader.withArgs("head").resolves(generateSignedBeaconHeaderResponse());
    const response = await supertest(restApi.server.server)
      .get(urlJoin(BEACON_PREFIX, getBlockHeader.url.replace(":blockId", "head")))
      .expect(200)
      .expect("Content-Type", "application/json; charset=utf-8");
    expect(response.body.data).to.not.be.undefined;
  });

  it("should not found block header", async function () {
    beaconBlocksStub.getBlockHeader.withArgs("4").resolves(null);
    await supertest(restApi.server.server)
      .get(urlJoin(BEACON_PREFIX, getBlockHeader.url.replace(":blockId", "4")))
      .expect(404);
  });

  it("should fail validation", async function () {
    beaconBlocksStub.getBlockHeader.throws(new Error("Invalid block id"));
    await supertest(restApi.server.server)
      .get(urlJoin(BEACON_PREFIX, getBlockHeader.url.replace(":blockId", "abc")))
      .expect(400)
      .expect("Content-Type", "application/json; charset=utf-8");
  });
});
