import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { isValidElement } from 'react'
import type { Components } from 'react-markdown'
import { MarkdownAsync } from 'react-markdown'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { DocsCopyButton } from './docs-copy-button'
import { DocsInlineCode } from './docs-inline-code'

const prettyCodeOptions = {
  bypassInlineCode: true,
  defaultLang: {
    block: 'plaintext',
    inline: ''
  },
  keepBackground: false,
  theme: 'github-dark-default'
} satisfies Parameters<typeof rehypePrettyCode>[0]

const languageLabels: Record<string, string> = {
  bash: 'Shell',
  css: 'CSS',
  html: 'HTML',
  javascript: 'JavaScript',
  js: 'JavaScript',
  json: 'JSON',
  jsx: 'JSX',
  markdown: 'Markdown',
  md: 'Markdown',
  plaintext: 'Text',
  scss: 'SCSS',
  sql: 'SQL',
  ts: 'TypeScript',
  tsx: 'TSX',
  typescript: 'TypeScript',
  xml: 'XML',
  yaml: 'YAML'
}

/** Checks whether a React element's props expose nested children. */
function hasChildren(value: unknown): value is { children?: ReactNode } {
  return typeof value === 'object' && value !== null && 'children' in value
}

/** Flattens highlighted token elements into the original copyable source. */
function extractText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (isValidElement(children) && hasChildren(children.props)) {
    return extractText(children.props.children)
  }
  return ''
}

/** Formats a Markdown fence language for the visible code toolbar. */
function formatLanguage(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return 'Code'
  return languageLabels[value] ?? value.toUpperCase()
}

/** Renders a highlighted block with language context and copy feedback. */
function Pre({ children, className, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const language = Reflect.get(props, 'data-language')
  const source = extractText(children).replace(/\n$/, '')

  return (
    <div className="docs-code-frame my-6 overflow-hidden border border-border bg-[#0b1020]">
      <div className="flex min-h-11 items-center justify-between border-border border-b bg-surface">
        <span className="px-4 font-mono text-[10px] text-signal uppercase tracking-[.12em]">
          {formatLanguage(language)}
        </span>
        <DocsCopyButton value={source} />
      </div>
      <pre
        {...props}
        className={`m-0 overflow-x-auto py-4 font-mono text-[#dce7ff] text-sm leading-7 [tab-size:2] [&_[data-line]]:min-h-6 [&_[data-line]]:px-5 [&_code]:w-max [&_code]:min-w-full ${className ?? ''}`}
      >
        {children}
      </pre>
    </div>
  )
}

/** Keeps inline code compact while leaving highlighted block tokens untouched. */
function Code({ className, ...props }: ComponentPropsWithoutRef<'code'>) {
  const language = Reflect.get(props, 'data-language')
  if (typeof language === 'string' || className?.includes('language-')) {
    return <code className={className} {...props} />
  }
  return <DocsInlineCode {...props} />
}

/** Adds a stable, visible self-link to a documentation section heading. */
function HeadingLink({ children, id }: { children: ReactNode; id?: string }) {
  if (!id) return children
  return (
    <a className="group inline-flex items-baseline gap-3" href={`#${id}`}>
      <span>{children}</span>
      <span
        aria-hidden
        className="font-mono text-signal text-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        #
      </span>
    </a>
  )
}

const components: Components = {
  a: ({ children, href }) => {
    const external = href?.startsWith('http') ?? false
    return (
      <a
        className="text-signal underline decoration-border underline-offset-4 hover:decoration-signal"
        href={href}
        rel={external ? 'noopener noreferrer' : undefined}
        target={external ? '_blank' : undefined}
      >
        {children}
        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    )
  },
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-signal border-l-2 bg-surface px-5 py-4 text-muted">
      {children}
    </blockquote>
  ),
  code: Code,
  figcaption: ({ children }) => (
    <figcaption className="border border-border border-b-0 bg-surface px-4 py-3 font-mono text-muted text-xs">
      {children}
    </figcaption>
  ),
  figure: ({ children }) => <figure className="m-0">{children}</figure>,
  h2: ({ children, id }) => (
    <h2
      className="mt-12 scroll-mt-28 border-border border-b pb-3 font-editorial text-4xl tracking-[-.025em]"
      id={id}
    >
      <HeadingLink id={id}>{children}</HeadingLink>
    </h2>
  ),
  h3: ({ children, id }) => (
    <h3 className="mt-8 scroll-mt-28 font-heading font-semibold text-xl" id={id}>
      <HeadingLink id={id}>{children}</HeadingLink>
    </h3>
  ),
  h4: ({ children, id }) => (
    <h4 className="mt-6 scroll-mt-28 font-heading font-semibold" id={id}>
      <HeadingLink id={id}>{children}</HeadingLink>
    </h4>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  ol: ({ children }) => <ol className="my-5 list-decimal space-y-2 pl-6 text-muted">{children}</ol>,
  p: ({ children }) => <p className="my-5 text-muted leading-8">{children}</p>,
  pre: Pre,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  table: ({ children }) => (
    <div className="my-7 overflow-x-auto border border-border">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  td: ({ children }) => <td className="border-border border-t px-4 py-3 text-muted">{children}</td>,
  th: ({ children }) => <th className="bg-surface px-4 py-3 font-semibold">{children}</th>,
  ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6 text-muted">{children}</ul>
}

/** Renders synchronized rule Markdown with highlighted, non-executable code examples. */
export async function DocsMarkdown({ content }: { content: string }) {
  return (
    <div className="docs-markdown">
      <MarkdownAsync
        components={components}
        rehypePlugins={[rehypeSlug, [rehypePrettyCode, prettyCodeOptions]]}
        remarkPlugins={[remarkGfm]}
        skipHtml
      >
        {content}
      </MarkdownAsync>
    </div>
  )
}
