import { marked } from 'marked';

export function renderMarkdown(text: string): string {
  return marked.parse(text, { breaks: true }) as string;
}
