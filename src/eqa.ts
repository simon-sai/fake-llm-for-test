/**
 * Minimal stand-ins for the prompts of the Explore Enterprise Q&A (EQA) pipeline. Explore tags each prompt with
 * `_name` on its message. The fake never makes up project data: it routes the question to the graph, writes a
 * query, and builds the final answer only from the data Explore sends back in the prompt.
 * Returns null for a prompt it does not know, so the caller keeps its generic fake answer.
 */

export interface PromptMessage {
  role?: string;
  content?: unknown;
  _name?: string;
}

function text(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((p: any) => p?.text ?? "").join(" ");
  return "";
}

/** The text after `label` up to the next blank line (or the end of the prompt). */
function section(prompt: string, label: string): string {
  const start = prompt.lastIndexOf(label);
  if (start < 0) return "";
  return prompt.slice(start + label.length).split(/\n\s*\n|\n---/)[0].trim();
}

interface SchemaNode {
  name: string;
  properties: string[];
}

/** Nodes and their properties from the "Node: X" / `Property: "p"` lines of the schema in a prompt. */
function schemaNodes(prompt: string): SchemaNode[] {
  const nodes: SchemaNode[] = [];
  for (const line of prompt.split("\n")) {
    const node = line.match(/^\s*Node:\s*(.+?)\s*$/);
    if (node) nodes.push({ name: node[1], properties: [] });
    const property = line.match(/^\s*Property:\s*"([^"]+)"/);
    if (property && nodes.length) nodes[nodes.length - 1].properties.push(property[1]);
  }
  return nodes;
}

/** "Category" -> "categor", so "categories" and "category" both match. */
const stem = (word: string) => word.toLowerCase().replace(/(ies|y|es|s)$/, "");

/**
 * The node the question is about: of the node names the question mentions, the one mentioned last
 * ("product categories" -> Category), as the head noun of an English noun phrase comes last.
 */
function questionNode(question: string, nodes: SchemaNode[]): SchemaNode | undefined {
  const q = question.toLowerCase();
  let best: { node: SchemaNode; at: number } | undefined;
  for (const node of nodes) {
    const at = q.lastIndexOf(stem(node.name));
    if (stem(node.name).length > 2 && at >= 0 && (!best || at > best.at)) best = { node, at };
  }
  return best?.node;
}

/** Properties worth returning: name-like ones and the label, else all of them. */
function outputFields(node: SchemaNode): string[] {
  const named = node.properties.filter((p) => /name|label|title/i.test(p));
  return named.length ? named : node.properties;
}

/** The question inside <Question>...</Question>, or the latest user input. */
function questionOf(prompt: string): string {
  return prompt.match(/<Question>([\s\S]*?)<\/Question>/)?.[1].trim() || section(prompt, "Latest user input:");
}

const tick = (name: string) => `\`${name.replace(/`/g, "``")}\``;

/** A Cypher query that returns the task's output fields of every node of its schema (one node label only). */
function cypherFor(prompt: string): string | null {
  const raw = prompt.match(/<TASK>([\s\S]*?)<\/TASK>/)?.[1];
  if (!raw) return null;
  let task: any;
  try { task = JSON.parse(raw); } catch { return null; }
  const label = String(task?.relevant_schema ?? "").split("->")[0].trim();
  if (!label) return null;
  const fields: string[] = task?.output_conditions?.fields?.length ? task.output_conditions.fields : ["label"];
  const columns = fields.map((f) => `n.${tick(f)} AS ${tick(f)}`).join(", ");
  // Rules of the prompt: backticks everywhere, "startsOn > 0" for every node, at most 200 records.
  return `MATCH (n:${tick(label)}) WHERE n.startsOn > 0 RETURN ${columns} LIMIT 200`;
}

/** The rows of one query result: an array of records, or the first array found inside the result object. */
function rowsOf(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      const rows = rowsOf(value);
      if (rows.length) return rows;
    }
  }
  return [];
}

const cell = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v))
  .replace(/\|/g, "\\|").replace(/\n/g, " ");

/** Markdown tables of the graph query results in the prompt; only data Explore retrieved, nothing invented. */
function answerFromResults(prompt: string): string {
  const raw = prompt.match(/\[FRESH QUERY RESULTS[^\]]*\][^\n]*\n[^\n]*\n=+\n([\s\S]*?)\n<INFORMATION>/)?.[1];
  let results: any[] = [];
  try { results = raw ? JSON.parse(raw) : []; } catch { results = []; }
  const parts: string[] = [];
  for (const result of Array.isArray(results) ? results : []) {
    const rows = rowsOf(result?.data);
    if (!rows.length) continue;
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    parts.push(`**${result?.title ?? "Result"}** (${rows.length} records)`, "",
      `| ${keys.join(" | ")} |`, `| ${keys.map(() => "---").join(" | ")} |`,
      ...rows.map((r) => `| ${keys.map((k) => cell(r[k])).join(" | ")} |`), "");
  }
  return parts.length ? parts.join("\n").trim() : "I did not find the data needed to answer this question.";
}

export function eqaAnswer(messages: PromptMessage[] = []): string | null {
  const tagged = messages.find((m) => m?._name);
  if (!tagged) return null;
  const prompt = text(tagged.content);
  switch (tagged._name) {
    case "conversationprofiling": {
      const question = section(prompt, "Latest user input:") || "the latest question";
      return JSON.stringify({ summary: `User asks: ${question}`, guideline: "" });
    }
    case "cypherplan": {
      const node = questionNode(questionOf(prompt), schemaNodes(prompt));
      if (!node) return "[]";
      return JSON.stringify([{
        goal: `All ${node.name} nodes`,
        relevant_schema: node.name,
        filter_conditions: [],
        output_conditions: { fields: outputFields(node) },
      }], null, 2);
    }
    case "cyphergen":
      return cypherFor(prompt);
    case "generateanswer":
      return answerFromResults(prompt);
    case "validatequestion": // the chat router: "1, graph" sends the question to the graph data
      return "1, graph";
    default:
      return null;
  }
}
