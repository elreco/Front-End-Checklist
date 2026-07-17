import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { aiFindingAnalysisSchema, legacyAiFindingAnalysisSchema } from '@coderocket/ai/schema'
import { buildFindingResolutionCopy } from '../lib/finding-resolution-copy'

const currentResult = aiFindingAnalysisSchema.parse({
  version: 2,
  diagnosis: {
    observed: 'Sixteen images are missing responsive image attributes.',
    expected: 'Images provide srcset and sizes values.',
    confidence: 'high',
    limitations: []
  },
  nextSteps: [
    {
      title: 'Add responsive image candidates',
      guidance: {
        site_owner: 'Ask the site developer to provide smaller image options for mobile screens.',
        freelancer: 'Add responsive image delivery and include verification in the delivery.',
        developer: 'Add srcset and sizes to the shared image component.'
      },
      verification: 'Inspect the HTML and rerun the responsive image check.'
    }
  ],
  likelyFiles: [
    {
      pattern: 'components/image.tsx',
      reason: 'The repeated output suggests a shared image component.'
    }
  ],
  difficulty: 'moderate',
  presentations: {
    site_owner: {
      summary: 'Some visitors may receive images that are larger than their screen needs.',
      whyItMatters: 'Large images can make pages feel slower on mobile connections.',
      brief: 'Ask the developer to make image delivery responsive.'
    },
    freelancer: {
      summary: 'The website needs responsive image delivery.',
      whyItMatters: 'This can improve mobile loading without changing the design.',
      brief: 'Implement responsive image delivery and verify the result.'
    },
    developer: {
      summary: 'Rendered img elements lack srcset and sizes.',
      whyItMatters: 'The browser cannot select an efficient candidate.',
      brief: 'Add srcset and sizes to the shared image component.'
    }
  },
  humanReviewRequired: true
})

describe('finding resolution copy', () => {
  it('builds distinct simple, client, developer, and assistant-ready formats', () => {
    const copy = buildFindingResolutionCopy({
      findingTitle: 'Implement responsive images',
      result: currentResult,
      sources: [{ title: 'MDN responsive images', url: 'https://example.com/responsive-images' }]
    })

    assert.match(copy.simpleExplanation, /Some visitors may receive images/)
    assert.match(copy.clientBrief, /Website improvement: Implement responsive images/)
    assert.match(copy.clientBrief, /The work is complete when:/)
    assert.match(copy.developerTask, /## Verified evidence/)
    assert.match(copy.developerTask, /components\/image\.tsx/)
    assert.match(copy.developerTask, /## Acceptance criteria/)
    assert.match(copy.assistantTask, /Inspect the repository before editing/)
    assert.match(copy.assistantTask, /fresh CodeRocket check/)
  })

  it('keeps saved legacy analyses useful without regenerating audience views', () => {
    const result = legacyAiFindingAnalysisSchema.parse({
      summary: 'A form field has no visible label.',
      whyItMatters: 'Some visitors may not know what information to enter.',
      diagnosis: {
        observed: 'The email input has no associated label.',
        expected: 'The email input has a visible associated label.',
        confidence: 'high',
        limitations: []
      },
      nextSteps: [
        {
          title: 'Add the label',
          explanation: 'Associate a visible label with the email input.',
          verification: 'Inspect the accessibility tree and run a fresh check.'
        }
      ],
      likelyFiles: [],
      difficulty: 'quick',
      brief: 'Add a visible email label and verify it.',
      humanReviewRequired: true
    })

    const copy = buildFindingResolutionCopy({
      findingTitle: 'Label the email field',
      result,
      sources: []
    })

    assert.match(copy.simpleExplanation, /A form field has no visible label/)
    assert.match(copy.clientBrief, /Recommended work:/)
    assert.match(copy.developerTask, /Associate a visible label/)
  })
})
