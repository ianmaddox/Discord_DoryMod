# Discord_DoryMod
A mod bod that automatically deletes messages in configured channels at a particular interval. Messages can be pinned to preserve them permanently. Admins can also allow individual users to preserved their own messages with a configurable reaction.

1) Set up your app in the discord developer portal

2) Store the token in a file called `.env` as follows:

```
DORYMOD_TOKEN=your_token_here
```

3) Add your bot to your sever

4) Call `!help @dorymod` to see available commands


# Tips
* Only admins can configure the bot.
* Be careful with threads. If the first message in a thread isn't saved but messages within are, the thread can be orphaned.