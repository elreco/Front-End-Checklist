import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { listFigmaFileScreens } from '../src/figma-api'
import { createFigmaScreenBlueprint } from '../src/figma-blueprint'
import {
  createFigmaScreenPaths,
  figmaNodeUrl,
  normalizeFigmaNodeId,
  parseFigmaFileUrl
} from '../src/figma-source'

describe('Figma source ingestion', () => {
  it('normalizes shared design links and node identifiers without keeping tracking values', () => {
    const reference = parseFigmaFileUrl(
      'https://www.figma.com/design/AbCdEf123/My%20shop?node-id=12-34&t=share-secret'
    )
    assert.deepEqual(reference, {
      fileKey: 'AbCdEf123',
      fileType: 'design',
      nodeId: '12:34',
      url: 'https://www.figma.com/design/AbCdEf123/My%20shop?node-id=12-34'
    })
    assert.equal(normalizeFigmaNodeId('5-18'), '5:18')
    assert.equal(normalizeFigmaNodeId('not-a-node'), undefined)
    assert.equal(parseFigmaFileUrl('https://example.com/design/AbCdEf123/file'), undefined)
  })

  it('creates distinct generated routes for repeated and translated screen names', () => {
    assert.deepEqual(createFigmaScreenPaths(['Accueil', 'À propos', 'À propos']), [
      '/',
      '/a-propos',
      '/a-propos-2'
    ])
  })

  it('lists only page-sized frames and attaches passive previews', async () => {
    const fetchImplementation: typeof fetch = async input => {
      const url = String(input)
      if (url.includes('/v1/images/'))
        return Response.json({ images: { '1:2': 'https://figma.example/frame.jpg' } })
      return Response.json({
        name: 'Shop design',
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Desktop',
              type: 'CANVAS',
              children: [
                {
                  id: '1:2',
                  name: 'Home',
                  type: 'FRAME',
                  absoluteBoundingBox: { height: 900, width: 1_440, x: 0, y: 0 }
                },
                {
                  id: '1:3',
                  name: 'Icon',
                  type: 'FRAME',
                  absoluteBoundingBox: { height: 24, width: 24, x: 0, y: 0 }
                }
              ]
            }
          ]
        }
      })
    }
    const reference = parseFigmaFileUrl('https://figma.com/design/AbCdEf123/Shop')
    assert.ok(reference)
    const result = await listFigmaFileScreens('oauth-token', reference, fetchImplementation)
    assert.equal(result.fileName, 'Shop design')
    assert.deepEqual(result.screens, [
      {
        height: 900,
        id: '1:2',
        name: 'Home',
        pageName: 'Desktop',
        thumbnailUrl: 'https://figma.example/frame.jpg',
        width: 1_440
      }
    ])
  })

  it('converts frame text, colors, image fills, buttons, and repeated cards into a blueprint', () => {
    const reference = parseFigmaFileUrl('https://figma.com/design/AbCdEf123/Shop')
    assert.ok(reference)
    const sourceUrl = figmaNodeUrl(reference, '1:2')
    const blueprint = createFigmaScreenBlueprint({
      fileName: 'Northstar shop',
      imageFillUrls: new Map([['hero-image', 'https://figma.example/hero.jpg']]),
      navigation: [{ href: sourceUrl, label: 'Home' }],
      reference,
      screen: {
        id: '1:2',
        name: 'Home',
        node: {
          id: '1:2',
          name: 'Home',
          type: 'FRAME',
          absoluteBoundingBox: { height: 1_200, width: 1_440 },
          fills: [{ color: { b: 0.96, g: 0.94, r: 0.9 }, type: 'SOLID' }],
          children: [
            {
              id: '2:1',
              name: 'Hero',
              type: 'FRAME',
              absoluteBoundingBox: { height: 640, width: 1_440 },
              children: [
                {
                  id: '3:1',
                  name: 'Headline',
                  type: 'TEXT',
                  characters: 'Objects for a calmer home',
                  fills: [{ color: { b: 0.08, g: 0.07, r: 0.06 }, type: 'SOLID' }],
                  style: { fontFamily: 'Inter', fontSize: 72, fontWeight: 700 }
                },
                {
                  id: '3:2',
                  name: 'Introduction',
                  type: 'TEXT',
                  characters: 'Small-batch pieces made to last.',
                  style: { fontFamily: 'Inter', fontSize: 18, fontWeight: 400 }
                },
                {
                  id: '3:3',
                  name: 'Hero image',
                  type: 'RECTANGLE',
                  absoluteBoundingBox: { height: 420, width: 560 },
                  fills: [{ imageRef: 'hero-image', type: 'IMAGE' }]
                },
                {
                  id: '3:4',
                  name: 'Primary button',
                  type: 'FRAME',
                  fills: [{ color: { b: 0.2, g: 0.3, r: 0.1 }, type: 'SOLID' }],
                  children: [
                    {
                      id: '3:5',
                      name: 'Button label',
                      type: 'TEXT',
                      characters: 'Shop now',
                      style: { fontFamily: 'Inter', fontSize: 16, fontWeight: 600 }
                    }
                  ]
                }
              ]
            }
          ]
        },
        renderUrl: 'https://figma.example/home.jpg'
      }
    })

    assert.equal(blueprint.brandName, 'Northstar shop')
    assert.equal(blueprint.backgroundColor, '#e6f0f5')
    assert.equal(blueprint.sections[0]?.heading, 'Objects for a calmer home')
    assert.equal(blueprint.sections[0]?.imageUrl, 'https://figma.example/hero.jpg')
    assert.equal(blueprint.sections[0]?.links[0]?.label, 'Shop now')
    assert.equal(blueprint.visualTheme?.headingFontFamily, 'Inter')
  })
})
