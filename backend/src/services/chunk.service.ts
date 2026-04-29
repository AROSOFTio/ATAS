export class ChunkService {
  createChunks(text: string, maxLength = 800, overlap = 120) {
    const normalized = text.replace(/\r/g, "").trim();
    if (!normalized) {
      return [];
    }

    const blocks = normalized
      .split(/\n{2,}/)
      .flatMap((block) => this.sliceBlock(block.trim(), maxLength, overlap))
      .filter(Boolean);

    return blocks.map((content, index) => ({
      content,
      metadata: {
        chunk_index: index,
        char_length: content.length
      }
    }));
  }

  private sliceBlock(block: string, maxLength: number, overlap: number) {
    if (block.length <= maxLength) {
      return [block];
    }

    const chunks: string[] = [];
    let cursor = 0;

    while (cursor < block.length) {
      const next = Math.min(cursor + maxLength, block.length);
      chunks.push(block.slice(cursor, next).trim());
      if (next >= block.length) {
        break;
      }
      cursor = Math.max(0, next - overlap);
    }

    return chunks;
  }
}

export const chunkService = new ChunkService();

