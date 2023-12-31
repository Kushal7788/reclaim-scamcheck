var express = require("express");
var router = express.Router();
var { Check } = require("../models/Check");
const { reclaimprotocol } = require("@reclaimprotocol/reclaim-sdk");
const bodyParser = require("body-parser");
const reclaim = new reclaimprotocol.Reclaim();
const emailProviderData = require("./utils.json")

router.get("/", (request, response) => {
  response.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get("/getId", async (request, response) => {
  const check = new Check();
  check.data = {};
  await check.save();
  response.status(200).json({
    checkId: check.checkId,
  });
});

router.post("/update/country/:checkId", async (req, res) => {
  const check = await Check.findOne({ checkId: req.params.checkId });
  if (!check)
    return res.status(401).json({ message: "Invalid URL, please check." });

  country = req.body.country;
  provider = req.body.provider;
  requestedProofsArr = [];
  if (country === "IN") {
    requestedProofsArr.push(
      new reclaim.CustomProvider({
        provider: "uidai-aadhar",
        payload: {},
      }));
  }
  else if (country === "USA") {
    requestedProofsArr.push(
      new reclaim.CustomProvider({
        provider: "irs-name",
        payload: {},
      }));
  }

  if (provider === "google") {
    requestedProofsArr.push(
      new reclaim.CustomProvider({
        provider: "google-login",
        payload: {},
      }));
  }
  else if (provider === "outlook") {
    requestedProofsArr.push(
      new reclaim.CustomProvider({
        provider: "outlook-login",
        payload: {},
      }));
  }
  else if (provider === "godaddy") {
    requestedProofsArr.push(
      new reclaim.CustomProvider({
        provider: "godaddy-login",
        payload: {},
      }));
  }
  else if (provider === "zoho") {
    requestedProofsArr.push(
      new reclaim.CustomProvider({
        provider: "zoho-email",
        payload: {},
      }));
  }
  console.log("check Id: ", check.checkId)
  const request = reclaim.requestProofs({
    title: "Reclaim Protocol",
    baseCallbackUrl: process.env.BASE_URL + "/update/proof",
    callbackId: check.checkId,
    requestedProofs: requestedProofsArr,
  });
  const reclaimUrl = await request.getReclaimUrl();
  if (!reclaimUrl)
    return res.status(500).json({ message: "Internal Server Error" });
  check.data = { country: country };
  await check.save();
  res.status(201).json({ url: reclaimUrl });
});

router.post("/update/proof", bodyParser.text("*/*"), async (req, res) => {
  const check = await Check.findOne({ checkId: req.query.id });
  if (!check) return res.status(401).send("<h1>Unable to update Proof</h1>");
  check.data = {
    ...check.data,
    proofs: JSON.parse(Object.keys(req.body)[0]).proofs,
  };
  check.data = {
    ...check.data,
    proofParams: check.data.proofs.map((proof) => {
      if (emailProviderData.hasOwnProperty(proof.provider)) {
        const paramaters = JSON.parse(proof.parameters);
        let obj = {};
        obj["email"] = paramaters[emailProviderData[proof.provider]['param1']];
        return obj;
      }
      else {
        return JSON.parse(proof.parameters);
      }
    }),
  }
  await check.save();
  // const isProofsCorrect = await reclaim.verifyCorrectnessOfProofs(check.checkId,
  //   check.data.proofs
  // );
  // if (isProofsCorrect) {
  //   check.data = {
  //     ...check.data,
  //     proofParams: check.data.proofs.map((proof) => proof.parameters),
  //   };
  // }
  res.status(201).send("<h1>Proofs has been shared with the Requestor. \n You can exit the screen</h1>");
});

router.get("/fetch/:checkId", async (req, res) => {
  const check = await Check.findOne({ checkId: req.params.checkId });
  if (!check)
    return res.status(401).json({ message: "Invalid URL, please check." });
  res.status(200).json({
    data: check.data,
  });
});

module.exports = router;