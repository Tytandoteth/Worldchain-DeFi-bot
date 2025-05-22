import { TwitterApi } from "twitter-api-v2";
import { askGPT } from "../../core/dist/openai.js";

const twitter = new TwitterApi({
  appKey:       process.env.TWITTER_APP_KEY!,
  appSecret:    process.env.TWITTER_APP_SECRET!,
  accessToken:  process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!
});

async function postTweet() {
  const thought = await askGPT("Give me a one-tweet market insight (≤280 chars)");
  await twitter.v2.tweet(thought);
  console.log("Tweeted:", thought);
}

async function replyMentions() {
  const me = await twitter.v2.me();
  const mentions = await twitter.v2.userMentionTimeline(me.data.id, {
    since_id: process.env.LAST_REPLY_ID
  });

  for (const m of mentions.tweets.reverse()) {
    const answer = await askGPT(m.text);
    await twitter.v2.reply(answer, m.id);
    process.env.LAST_REPLY_ID = m.id; // swap for durable store later
  }
}

(async () => {
  await postTweet();
  await replyMentions();
})();
