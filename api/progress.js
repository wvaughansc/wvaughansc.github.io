export default async function handler(req, res) {
  const NOTION_API_KEY = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.STEPS_DATABASE_ID;
  const DONE_PROPERTY = process.env.DONE_PROPERTY || "Done";
  const SKIPPED_PROPERTY = process.env.SKIPPED_PROPERTY || "Skipped";

  try {
    let allResults = [];
    let cursor = undefined;

    do {
      const body = {
        page_size: 100
      };

      if (cursor) {
        body.start_cursor = cursor;
      }

      const notionRes = await fetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        }
      );

      if (!notionRes.ok) {
        const error = await notionRes.text();
        throw new Error(error);
      }

      const data = await notionRes.json();

      allResults.push(...(data.results || []));

      cursor = data.has_more
        ? data.next_cursor
        : undefined;

    } while (cursor);

    let done = 0;
    let skipped = 0;

    for (const page of allResults) {
      const props = page.properties || {};

      if (props[DONE_PROPERTY]?.checkbox === true) {
        done++;
      }

      if (props[SKIPPED_PROPERTY]?.checkbox === true) {
        skipped++;
      }
    }

const total = allResults.length;

const remaining =
  Math.max(
    0,
    total - done - skipped
  );

const executionPct =
  total > 0
    ? Math.round((done / total) * 100)
    : 0;

const completionPct =
  total > 0
    ? Math.round(
        ((done + skipped) / total) * 100
      )
    : 0;

return res.status(200).json({
  total,
  done,
  skipped,
  remaining,
  executionPct,
  completionPct
});

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}
