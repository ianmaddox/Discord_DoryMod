Discord_DoryMod
===============

A mod bot that automatically deletes messages in configured channels at a specified interval. Messages can be pinned to preserve them permanently. Admins can also allow individual users to preserve their own messages with a configurable reaction.

Setup Process
-------------

1.  Set up your app in the Discord Developer Portal

    -   Visit the Discord Developer Portal and create a new application.
    -   Navigate to the 'Bot' section and create a new bot.
    -   Copy the bot token provided.
2.  Store the token in a file called `.env` as follows:

    makefileCopy code

    `DORYMOD_TOKEN=your_token_here`

    Replace `your_token_here` with the token you obtained from the Discord Developer Portal.

3.  Add your bot to your server

    -   In the Discord Developer Portal, navigate to the 'OAuth2' section.
    -   Under 'Scopes', select 'bot'.
    -   Choose the appropriate permissions for your bot.
    -   Use the generated URL to add the bot to your Discord server.
4.  Call `!help @dorymod` in your server to see available commands

Tips
----

-   Only admins can configure the bot.
-   Be careful with threads. If the first message in a thread isn't saved but messages within are, the thread can become orphaned.

Disclaimer
----
This application is not infallible and may occasionally make mistakes. The contributors to this open source software are not liable for any lost data, damages, or other unintended outcomes that may result from its use.