const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const databaseId = process.env.NOTION_DATABASE_ID;

async function main() {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Status',
      select: { equals: 'Posted' },
    },
  });

  console.log('Posts in Notion with IG Views:\n');

  let totalIgViews = 0;

  for (const page of response.results) {
    const title = page.properties['Title']?.title?.[0]?.plain_text || 'Untitled';
    const igViews = page.properties['IG Views']?.number || 0;
    const igUrl = page.properties['Instagram URL']?.url || '';

    if (igUrl) {
      console.log(`${title}`);
      console.log(`  IG Views: ${igViews}`);
      console.log(`  URL: ${igUrl}\n`);
      totalIgViews += igViews;
    }
  }

  console.log(`Total IG Views in Notion: ${totalIgViews}`);
}

main().catch(console.error);
