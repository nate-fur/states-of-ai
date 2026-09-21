"use node";

import { v } from "convex/values";
import { extractText, getDocumentProxy } from "unpdf";
import { internalAction } from "../_generated/server";

// Runs in Convex's Node runtime because PDF parsing needs a library the
// default runtime cannot load. Called once per PDF bill; the result is stored
// in billTexts so it never has to run again for the same text hash.

// Action arguments are capped at 5 MiB, so a large PDF arrives as a file
// storage id instead of inline base64; the caller deletes the file after.

export const pdfToText = internalAction({
  args: { base64: v.optional(v.string()), storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { base64, storageId }): Promise<string> => {
    let bytes: Uint8Array;
    if (storageId) {
      const blob = await ctx.storage.get(storageId);
      if (!blob) throw new Error("pdfToText: stored PDF not found");
      bytes = new Uint8Array(await blob.arrayBuffer());
    } else if (base64) {
      bytes = new Uint8Array(Buffer.from(base64, "base64"));
    } else {
      throw new Error("pdfToText: base64 or storageId required");
    }
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  },
});
