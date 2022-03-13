const { Client, Intents, MessageEmbed } = require("discord.js");
const { ethers } = require("ethers");
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
const botToken = process.env.BOT_TOKEN;
const salesChannel = "947674526555189279";
const botDiagnostics = "952398633666478130";
function initializeBot() {
  client.login(botToken);
  client.on("ready", () => {
    console.log("BAC Concierge is so fucking HYPED!");
    const channel1 = client.channels.cache.find(
      (channel) => channel.id === botDiagnostics
    );
    channel1.send("BAC Concierge has been initialized");
  });
}

function postToChannel(text) {
  const channel1 = client.channels.cache.find(
    (channel) => channel.id === botDiagnostics
  );
  channel1.send(text);
}

async function postToChannelAsEmbed(eventPackage) {
  console.log("Posting to Discord:", eventPackage.assetName);
  const embed = new MessageEmbed()
    .setColor("#ebbe00")
    .setTitle(eventPackage.assetName + " was just sold!")
    .setDescription(
      "It's true; " +
        eventPackage.assetName +
        " was just sold on the secondary market!"
    )

    .setURL(eventPackage.assetLink)
    .setImage(eventPackage.imageURL)
    .addFields(
      { name: "Name", value: eventPackage.assetName, inline: true },
      {
        name: "Price:",
        value:
          eventPackage.assetPriceETH +
          ethers.constants.EtherSymbol +
          " ($" +
          eventPackage.assetPriceUSD +
          ")",
        inline: true,
      }
    );
  const channel1 = client.channels.cache.find(
    (channel) => channel.id === salesChannel
  );
  channel1.send({ embeds: [embed] });
}
module.exports = {
  init: initializeBot,
  post: postToChannel,
  postEmbed: postToChannelAsEmbed,
};
