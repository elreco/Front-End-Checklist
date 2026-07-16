import type { Components } from 'react-markdown'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components: Components = {
  a: ({ children, href }) => (
    <a
      className="text-signal underline decoration-border underline-offset-4 hover:decoration-signal"
      href={href}
      rel={href?.startsWith('http') ? 'noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-signal border-l-2 bg-surface px-5 py-4 text-muted">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-surface-raised px-1.5 py-0.5 font-mono text-[.9em] text-foreground">
      {children}
    </code>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 border-border border-b pb-3 font-editorial text-4xl tracking-[-.025em]">
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className="mt-8 font-heading font-semibold text-xl">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-6 font-heading font-semibold">{children}</h4>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  ol: ({ children }) => <ol className="my-5 list-decimal space-y-2 pl-6 text-muted">{children}</ol>,
  p: ({ children }) => <p className="my-5 text-muted leading-8">{children}</p>,
  pre: ({ children }) => (
    <pre className="my-6 overflow-x-auto border border-border bg-[#0B1020] p-5 font-mono text-[#dce7ff] text-sm leading-7 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-7 overflow-x-auto border border-border">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  td: ({ children }) => <td className="border-border border-t px-4 py-3 text-muted">{children}</td>,
  th: ({ children }) => <th className="bg-surface px-4 py-3 font-semibold">{children}</th>,
  ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6 text-muted">{children}</ul>
}

/** Render upstream-backed rule Markdown without executing embedded HTML or MDX components. */
export function DocsMarkdown({ content }: { content: string }) {
  return (
    <div className="docs-markdown">
      <Markdown components={components} remarkPlugins={[remarkGfm]} skipHtml>
        {content}
      </Markdown>
    </div>
  )
}
