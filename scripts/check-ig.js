const token = process.env.META_ACCESS_TOKEN;
const userId = process.env.IG_USER_ID;

async function test() {
  const res = await fetch(`https://graph.facebook.com/v19.0/${userId}/media?fields=id,shortcode,media_type,media_product_type,like_count,comments_count&limit=10&access_token=${token}`);
  const data = await res.json();

  console.log("All Instagram media with metrics:\n");

  let totalViews = 0;

  for (const m of data.data || []) {
    const isVideo = m.media_type === "VIDEO" || m.media_type === "REELS";
    const metrics = isVideo ? "reach,saved,shares" : "reach,saved";

    const insightRes = await fetch(`https://graph.facebook.com/v19.0/${m.id}/insights?metric=${metrics}&access_token=${token}`);
    const insights = await insightRes.json();

    let reach = 0;
    if (!insights.error) {
      reach = insights.data?.find(i => i.name === "reach")?.values?.[0]?.value || 0;
    }

    console.log(`${m.shortcode} (${m.media_product_type}): reach=${reach}, likes=${m.like_count}, comments=${m.comments_count}`);
    totalViews += reach;
  }

  console.log(`\nTotal reach (views): ${totalViews}`);
}

test();
