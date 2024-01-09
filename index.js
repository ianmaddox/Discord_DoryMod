const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('./config.json');
const savedMessagesFile = './savedMessages.json';
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const token = process.env.DORYMOD_TOKEN;
const prefix = '!';
const purgeIntervalSeconds = 10 * 60;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});


client.login(token);

let workingFlag = false;
client.on('ready', () => {
  console.log('DoryMod is, uh, I forget...');

  // Check each channel periodically
  setInterval(() => {
    if (workingFlag) {
      console.log('Already working, skipping interval');
      return;
    }
    console.log('Checking channels...');

    workingFlag = true;
    const config = loadConfig();
    for (const [serverID, channels] of Object.entries(config)) {
      const guild = client.guilds.cache.get(serverID);
      if (!guild) continue;

      for (const [channelID, settings] of Object.entries(channels)) {
        const channel = guild.channels.cache.get(channelID);
        if (!channel || channel.type !== ChannelType.GuildText) continue;

        const timeoutMillis = timeoutToMillis(settings.timeout);
        const thresholdDate = new Date(Date.now() - timeoutMillis);



        channel.messages.fetch().then(messages => {
          messages.forEach(message => {
            if (!message.pinned && message.createdAt < thresholdDate) {
              message.fetch(true).then(fetchedMessage => {
                const saveReaction = settings.saveReaction;
                const reaction = fetchedMessage.reactions.cache.find(r => r.emoji.name === saveReaction);

                // Proceed if there is a save reaction
                if (reaction) {
                  reaction.users.fetch().then(users => {
                    const userReacted = users.has(message.author.id);

                    // Check if the author has reacted with the saveReaction
                    if (userReacted) {
                      // Save or update the message in saved messages list
                      saveMessageID(channel.id, message.id);
                      if (!users.has(client.user.id)) {
                        reaction.react(saveReaction).catch(console.error); // Add bot's reaction
                      }
                    } else {
                      // If the author has not reacted, delete the message
                      console.log(`Deleted message from ${message.author.tag} posted at ${message.createdAt}`);
                      message.delete().catch(console.error);
                      removeMessageID(channel.id, message.id);
                      reaction.users.remove(client.user.id).catch(console.error); // Remove bot's reaction
                    }
                  }).catch(console.error);
                } else {
                  // If no saveReaction is found, delete the message
                  console.log(`Deleted message from ${message.author.tag} posted at ${message.createdAt}`);
                  message.delete().catch(console.error);
                  removeMessageID(channel.id, message.id);
                }
              }).catch(console.error);
            }
          });
        }).catch(console.error);


      }
    }
    workingFlag = false;
  }, purgeIntervalSeconds * 1000); // Interval in milliseconds
});

client.on('messageCreate', message => {
  // Ignore messages from bots or without the correct prefix
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  console.log({user: message.author.username, command, content: message.content});

  // Check if the user is an administrator
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    message.reply("Sorry, you need to be an administrator to use this command.");
    return;
  }
  // Help command
  if (command === 'help' || command === 'h') {
    let helpMessage = `**Commands:**`;
    helpMessage +=`\n\n\`!help (!h)\`: Display this help.`;
    helpMessage +=`\n\n\`!addchannel (!ac)\`: Add a channel to monitoring. Usage: \`!addchannel {channelID} {timeoutInt} {timeoutStr} @DoryMod\``;
    helpMessage +=`\n\n\`!removechannel (!rc)\`: Remove a channel from monitoring. Usage: \`!removechannel {channelID} @DoryMod\``;
    helpMessage +=`\n\n\`!listchannels (!lc)\`: List all visible text channels.  Usage: \`!listchannels @DoryMod\``;
    helpMessage +=`\n\n\`!listmonitored (!lm)\`: List all monitored channels and their settings.  Usage: \`!listmonitored @DoryMod\``;
    helpMessage +=`\n\n\`!configuresave (!cs)\`: Set up or disable users' ability to prevent individual messages from being deleted by adding a reaction. Usage: \`!configuresave {channelID} ({reactionEmoji}) @dorymod\`.`;
    helpMessage +=`\n\n\`!lockdown (!l)\`: Enable (1) or disable (0) config changes to this server. Usage: \`!lockdown [1|0] @dorymod\`.`;
    message.channel.send(helpMessage);
  }

  // Inside your messageCreate event
  if (command === 'lockdown' || command === 'l') {
    if (args.length >= 1) {
      const lockdownStatus = args[0] === '1' ? 1 : 0;
      const serverConfig = config[message.guild.id] || {};

      serverConfig.lockdown = lockdownStatus;
      config[message.guild.id] = serverConfig;
      saveConfig(config);

      message.channel.send(`Lockdown status set to ${lockdownStatus}.`);
    } else {
      message.channel.send('Invalid command format. Usage: `!lockdown {1|0}`');
    }
  }

  // Check for lockdown status for other commands
  const serverConfig = config[message.guild.id] || {};
  if (serverConfig.lockdown && serverConfig.lockdown === 1 && command !== 'lockdown') {
    message.reply("Configuration changes are locked down for this server.");
    return;
  }

  // List all visible text channel names and their IDs
  if (command === 'listchannels' || command === 'lc') {
    message.guild.channels.fetch()
    .then(channels => {
      let response = channels
      .filter(channel => channel.type === ChannelType.GuildText)
      .map(channel => `${channel.id}: ${channel.name}`)
      .join('\n');
      message.channel.send(`Visible Text Channels:\n${response}`);
    })
    .catch(console.error);
  }

  // Remove channel command
  if (command === 'removechannel' || command === 'rc') {
    if (args.length >= 1) {
      const channelID = args[0];
      const serverConfig = config[message.guild.id];
      if (serverConfig && serverConfig[channelID]) {
        delete serverConfig[channelID];
        saveConfig(config);
        message.channel.send(`Channel ${channelID} has been removed from monitoring.`);
      } else {
        message.channel.send(`Channel ${channelID} is not being monitored.`);
      }
    } else {
      message.channel.send('Invalid command format. Usage: `!removechannel {channelID}`');
    }
  }

  // List only channels that are being monitored, their ID, and the age threshold
  if (command === 'listmonitored' || command === 'lm') {
    let response = '';
    const serverConfig = config[message.guild.id]; // Get configuration for the current server
    if (serverConfig) {
      for (const [channelID, settings] of Object.entries(serverConfig)) {
        const channel = client.channels.cache.get(channelID);
        if (channel) {
          const { timeout } = settings;
          const timeoutStr = Object.entries(timeout)
          .filter(([unit, value]) => value > 0)
          .map(([unit, value]) => `${value}${unit}`)
          .join(', ');
          response += `(${channel.id}) ${channel.name} (Timeout: ${timeoutStr})\n`;
        }
      }
    }
    message.channel.send(`Monitored Channels:\n${response}`);
  }

  if (command === 'addchannel' || command === 'ac') {
    // Check for correct argument length and mention
    if (args.length >= 3 && message.mentions.users.first()) {
      const mentionedUser = message.mentions.users.first();
      // Ensure the mentioned user is the bot itself
      if (mentionedUser.id === client.user.id) {
        const serverID = message.guildId;
        const channelID = args[0];
        const timeoutInt = parseInt(args[1], 10);
        const timeoutStr = args[2].toLowerCase().slice(0,1);
        const validTimeoutStrs = ['s', 'm', 'h', 'd', 'w', 'm', 'y'];

        console.log("Adding channel", {serverID, channelID, timeoutInt, timeoutStr});
        // Validate channel ID, timeout integer, and timeout string
        if (!isNaN(timeoutInt) && validTimeoutStrs.includes(timeoutStr)) {
          // Add or update channel in the configuration
          const serverConfig = config[message.guild.id] || {};
          serverConfig[channelID] = { "timeout": { [timeoutStr]: timeoutInt } };
          config[message.guild.id] = serverConfig;

          // Save updated configuration (implement saveConfig function)
          saveConfig(config);

          message.channel.send(`Channel ${channelID} added with timeout ${timeoutInt}${timeoutStr}.`);
        } else {
          message.channel.send('Invalid arguments. Please use the format: !addchannel {channelID} {timeoutInt} {timeoutStr} @DoryMod');
        }
      }
    } else {
      message.channel.send('Hey, no bueno. Please use the format: !addchannel {channelID} {timeoutInt} {timeoutStr} @DoryMod');
    }
  }

  if (command === 'configuresave' || command === 'cs') {
    if (args.length >= 1) {
      const channelID = args[0];
      const emojiReaction = args[1] || null;
      const serverConfig = config[message.guild.id] || {};

      if (serverConfig[channelID]) {
        serverConfig[channelID].saveReaction = emojiReaction;
        config[message.guild.id] = serverConfig;
        saveConfig(config);
        message.channel.send(`Configured save reaction for channel ${channelID} to ${emojiReaction || 'None'}.`);
      } else {
        message.channel.send(`Channel ${channelID} is not being monitored.`);
      }
    } else {
      message.channel.send('Invalid command format. Usage: `!configuresave {channelID} [{emojiReaction}]`');
    }
  }
});

function saveConfig(newConfig) {
  fs.writeFile('./config.json', JSON.stringify(newConfig, null, 2), err => {
    if (err) console.error('Error writing to config file:', err);
  });
}

// Function to load the configuration
function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    const configData = fs.readFileSync(configPath);
    return JSON.parse(configData);
  } catch (err) {
    console.error('Error reading config file:', err);
    return {};
  }
}

// Function to load saved messages
function loadSavedMessages() {
  try {
    const savedMessageJSON = fs.readFileSync(savedMessagesFile) || '{}';
    return JSON.parse(savedMessageJSON);
  } catch (error) {
    console.error('Error reading the saved messages file:', error);
    return {};
  }
}


// Function to save a message ID
function saveMessageID(channelID, messageID) {
  const savedMessages = loadSavedMessages();
  if (!savedMessages[channelID]) {
    savedMessages[channelID] = {};
  }
  savedMessages[channelID][messageID] = true;

  fs.writeFileSync(savedMessagesFile, JSON.stringify(savedMessages, null, 2));
}


// Function to remove a message ID
function removeMessageID(channelID, messageID) {
  const savedMessages = loadSavedMessages();
  if (savedMessages[channelID] && savedMessages[channelID][messageID]) {
    delete savedMessages[channelID][messageID];

    if (Object.keys(savedMessages[channelID]).length === 0) {
      delete savedMessages[channelID];
    }

    fs.writeFileSync(savedMessagesFile, JSON.stringify(savedMessages, null, 2));
  }
}

// Function to check if a message is saved
function isMessageSaved(channelID, messageID) {
  const savedMessages = loadSavedMessages();
  return savedMessages[channelID] && savedMessages[channelID][messageID];
}

// Function to convert timeout to milliseconds
function timeoutToMillis(timeout) {
  const timeUnits = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    M: 30 * 24 * 60 * 60 * 1000, // Approximation
    y: 365 * 24 * 60 * 60 * 1000 // Approximation
  };
  return Object.entries(timeout).reduce((acc, [unit, value]) => acc + (value * (timeUnits[unit] || 0)), 0);
}