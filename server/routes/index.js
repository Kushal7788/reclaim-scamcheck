var express = require("express");
var router = express.Router();
var { Check } = require("../models/Check");
const { reclaimprotocol } = require("@reclaimprotocol/reclaim-sdk");
const bodyParser = require("body-parser");
const reclaim = new reclaimprotocol.Reclaim();

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

  const { country } = req.body;
  let request;
  if (country === "IN") {
    request = reclaim.requestProofs({
      title: "Reclaim Protocol",
      baseCallbackUrl: process.env.BASE_URL + "/update/proof",
      callbackId: check.checkId,
      requestedProofs: [
        new reclaim.CustomProvider({
          provider: "uidai-aadhar",
          payload: {},
        }),
      ],
    });
  }
  else if (country === "USA") {
    request = reclaim.requestProofs({
      title: "Reclaim Protocol",
      baseCallbackUrl: process.env.BASE_URL + "/update/proof",
      callbackId: check.checkId,
      requestedProofs: [
        new reclaim.CustomProvider({
          provider: "irs-name",
          payload: {},
        }),
      ],
    });
  }
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
    proofParams: check.data.proofs.map((proof) => proof.parameters),
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
  res.status(201).send("<h1>Proof was generated</h1>");
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
