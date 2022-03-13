const axios = require("axios");
const _ = require("lodash");
const moment = require("moment");
const { ethers } = require("ethers");
const tweet = require("./tweet");
const cache = require("./cache");
const discord = require("./discord");

var lastSaleTime = 4078158996; //Update after pushing new content to repo to avoid duplication of work
cache.set("lastSaleTime", lastSaleTime);
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
discord.init();

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
  if (formattedEthPrice >= 0.25) {
    tweetText = "Holy cow, ";
  } else if (formattedEthPrice >= 0.5) {
    tweetText = "Oh man, oh geez, ";
  }
  tweetText =
    tweetText +
    `${assetName} was just sold for ${formattedEthPrice}${
      ethers.constants.EtherSymbol
    } ($${Number(formattedUsdPrice).toFixed(2)}) #BAC ${openseaLink}`;

  const imageUrl = _.get(event, ["asset", "image_url"]);
  //console.log("Would have tweeted:", tweetText); --Use this when local testing to not send tweets 4000 times.
  return tweet.tweetWithImage(tweetText, imageUrl);
}

//Posts an embeded message in the #sales-bot channel.
function sendSalesEmbed(event) {
  const totalPrice = _.get(event, "total_price");

  const tokenDecimals = _.get(event, ["payment_token", "decimals"]);
  const tokenUsdPrice = _.get(event, ["payment_token", "usd_price"]);
  const tokenEthPrice = _.get(event, ["payment_token", "eth_price"]);
  const formattedUnits = ethers.utils.formatUnits(totalPrice, tokenDecimals);
  const formattedEthPrice = formattedUnits * tokenEthPrice;
  const formattedUsdPrice = formattedUnits * tokenUsdPrice;

  const eventData = {
    assetName: _.get(
      event,
      ["asset", "name"],
      _.get(event, ["asset_bundle", "name"])
    ),
    assetLink: _.get(
      event,
      ["asset", "permalink"],
      _.get(event, ["asset_bundle", "permalink"])
    ),
    assetPrice: formattedUnits,
    assetPriceETH: formattedEthPrice,
    assetPriceUSD: formattedUsdPrice,
    imageURL: _.get(event, ["asset", "image_url"]),
  };
  return discord.postEmbed(eventData);
}

setInterval(() => {
  lastSaleTime =
    cache.get("lastSaleTime", null) ||
    moment().startOf("minute").subtract(59, "seconds").unix();
  console.log(`Last sale ID: ${cache.get("lastSaleTime", null)}`);
  options.params.collection_slug = "boardapecollective";
  //Check the BAC Collection for sales
  axios
    .request(options)
    .then((response) => {
      const events = _.get(response, ["data", "asset_events"]);
      const filteredEvents = _.filter(events, function (ev) {
        const filtered = _.get(ev, "id");
        return filtered > lastSaleTime;
      });
      const sortedEvents = _.sortBy(filteredEvents, function (event) {
        const created = _.get(event, "id");
        return created;
      });

      console.log(`${filteredEvents.length} sales since the last one...`);

      _.each(sortedEvents, (event) => {
        const created = _.get(event, "id");
        cache.set("lastSaleTime", created);
        sendSalesEmbed(event);
        return formatAndSendTweet(event);
      });
    })
    .catch((error) => {
      console.error(error);
    });
  //Check the BAC Board of Directors too
  options.params.collection_slug = "bacboardofdirectors";
  axios
    .request(options)
    .then((response) => {
      const events = _.get(response, ["data", "asset_events"]);
      const filteredEvents = _.filter(events, function (ev) {
        const filtered = _.get(ev, "id");
        return filtered > lastSaleTime;
      });
      const sortedEvents = _.sortBy(filteredEvents, function (event) {
        const created = _.get(event, "id");

        return created;
      });

      console.log(`${filteredEvents.length} sales since the last one...`);
      _.each(sortedEvents, (event) => {
        const created = _.get(event, "id");
        cache.set("lastSaleTime", created);
        sendSalesEmbed(event);
        return formatAndSendTweet(event);
      });
    })
    .catch((error) => {
      console.error(error);
    });
}, 60000);
