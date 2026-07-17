import assert from 'node:assert/strict'
import * as path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadRules } from '../load-rules'

const fixtureRulesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/rules/en'
)

test('loadRules parses normalized rule records from MDX files', () => {
  const rules = loadRules(fixtureRulesDir)

  assert.deepEqual(rules, [
    {
      title: 'Use the language attribute',
      description:
        'Declares the document language so browsers and assistive technology can interpret its content correctly.',
      slug: 'language-attribute',
      categories: ['html'],
      subcategory: 'meta',
      priority: 'high',
      difficulty: 'beginner',
      estimatedTime: 5,
      tldr: ['Add lang to the html element', 'Use a valid BCP 47 language tag'],
      aiContext: 'Use when reviewing a full HTML document or application shell.',
      prompts: {
        check:
          'Check for a lang attribute on the html element and verify that its value is a valid language tag.',
        fix: 'Add the correct lang attribute to the html element.',
        explain: 'Explain why the lang attribute matters.',
        codeReview: 'Review the document root and report the exact language value found.'
      },
      sources: [
        {
          title: 'HTML language declaration',
          url: 'https://html.spec.whatwg.org/multipage/dom.html#attr-lang',
          type: 'spec',
          id: 'html-lang-attribute',
          role: 'standard',
          authority: 'primary'
        }
      ],
      relatedRules: [
        {
          slug: 'direction-attribute',
          reason: 'Both attributes describe how document content is interpreted.'
        }
      ],
      content: '# Rule body',
      primaryCategory: 'html',
      url: '/rules/html/language-attribute'
    },
    {
      title: 'Use block categories',
      slug: 'multi-category-rule',
      categories: ['html', 'accessibility'],
      priority: 'medium',
      content: '# Multi category body',
      primaryCategory: 'html',
      url: '/rules/html/multi-category-rule'
    }
  ])
})
