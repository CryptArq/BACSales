const axios = require("axios");
const cache = require("./cache");
const tweet = require("./tweet");
const moment = require("moment");
const { ethers } = require("ethers");
const _ = require("lodash");
var options = {
  method: "GET",
  url: "https://api.opensea.io/api/v1/events",
  params: {
    only_opensea: "false",
    collection_slug: "boardapecollective",
    event_type: "successful",
  },
  headers: {
    Accept: "application/json",
    "X-API-KEY": process.env.X_API_KEY,
  },
};

console.log(
  `Last sale (in seconds since Unix epoch): ${cache.get("lastSaleTime", null)}`
);
function formatAndSendTweet(event) {
  // Handle both individual items + bundle sales
  const assetName = _.get(
    event,
    ["asset", "name"],
    _.get(event, ["asset_bundle", "name"])
  );
  const openseaLink = _.get(
    event,
    ["asset", "permalink"],
    _.get(event, ["asset_bundle", "permalink"])
  );

  const totalPrice = _.get(event, "total_price");

  const tokenDecimals = _.get(event, ["payment_token", "decimals"]);
  const tokenUsdPrice = _.get(event, ["payment_token", "usd_price"]);
  const tokenEthPrice = _.get(event, ["payment_token", "eth_price"]);

  const formattedUnits = ethers.utils.formatUnits(totalPrice, tokenDecimals);
  const formattedEthPrice = formattedUnits * tokenEthPrice;
  const formattedUsdPrice = formattedUnits * tokenUsdPrice;
  var tweetText = "";
  if (formattedEthPrice > 0.25) {
    tweetText = "Holy cow, ";
  }
  tweetText =
    tweetText +
    `${assetName} was just bought for ${formattedEthPrice}${
      ethers.constants.EtherSymbol
    } ($${Number(formattedUsdPrice).toFixed(2)}) #BAC ${openseaLink}`;

  console.log(tweetText);

  // OPTIONAL PREFERENCE - don't tweet out sales below X ETH (default is 1 ETH - change to what you prefer)
  // if (Number(formattedEthPrice) < 1) {
  //     console.log(`${assetName} sold below tweet price (${formattedEthPrice} ETH).`);
  //     return;
  // }

  // OPTIONAL PREFERENCE - if you want the tweet to include an attached image instead of just text
  const imageUrl = _.get(event, ["asset", "image_url"]);
  return tweet.tweetWithImage(tweetText, imageUrl);

  //return tweet.tweet(tweetText);
}
setInterval(() => {
  const lastSaleTime =
    cache.get("lastSaleTime", null) ||
    moment().startOf("minute").subtract(59, "seconds").unix();
  options.params.collection_slug = "boardapecollective";
  axios
    .request(options)
    .then((response) => {
      const events = _.get(response, ["data", "asset_events"]);
      console.log("response");
      const sortedEvents = _.sortBy(events, function (event) {
        const created = _.get(event, "created_date");

        return new Date(created);
      });

      console.log(`${events.length} sales since the last one...`);

      _.each(sortedEvents, (event) => {
        const created = _.get(event, "created_date");

        cache.set("lastSaleTime", moment(created).unix());
        console.log(event);
        return formatAndSendTweet(event);
      });
    })
    .catch((error) => {
      console.error(error);
    });
  options.params.collection_slug = "bacboardofdirectors";
  axios
    .request(options)
    .then((response) => {
      const events = _.get(response, ["data", "asset_events"]);
      console.log("response");
      const sortedEvents = _.sortBy(events, function (event) {
        const created = _.get(event, "created_date");

        return new Date(created);
      });

      console.log(`${events.length} sales since the last one...`);

      _.each(sortedEvents, (event) => {
        const created = _.get(event, "created_date");

        cache.set("lastSaleTime", moment(created).unix());
        console.log(event);
        return formatAndSendTweet(event);
      });
    })
    .catch((error) => {
      console.error(error);
    });
}, 6000);
