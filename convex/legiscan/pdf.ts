"use node";

import { v } from "convex/values";
import { extractText, getDocumentProxy } from "unpdf";
import { internalAction } from "../_generated/server";

// Runs in Convex's Node runtime because PDF parsing needs a library the
// default runtime cannot load. Called once per PDF bill; the result is stored
// in billTexts so it never has to run again for the same text hash.

export const pdfToText = internalAction({
  args: { base64: v.string() },
  handler: async (_ctx, { base64 }): Promise<string> => {
    const bytes = new Uint8Array(Buffer.from(base64, "base64"));
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  },
});
