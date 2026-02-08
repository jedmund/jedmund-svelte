<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:media="http://search.yahoo.com/mrss/"
  exclude-result-prefixes="atom content media">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title><xsl:value-of select="/rss/channel/title" /> — RSS Feed</title>
        <style>
          *,
          *::before,
          *::after {
            box-sizing: border-box;
          }

          body {
            font-family: "Circular Std", Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            color: #4d4d4d;
            background: #e8e8e8;
            margin: 0;
            padding: 32px 16px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          .container {
            max-width: 700px;
            margin: 0 auto;
          }

          .card {
            background: #ffffff;
            border-radius: 24px;
            padding: 24px;
            margin-bottom: 16px;
          }

          .feed-header h1 {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.2rem;
            font-weight: 500;
            color: #e33d3d;
            margin: 0 0 12px 0;
          }

          .feed-header h1 .rss-icon {
            width: 18px;
            height: 18px;
            flex-shrink: 0;
          }

          .feed-header p {
            margin: 0 0 8px 0;
            font-size: 0.9375rem;
            color: #666666;
          }

          .feed-header .subscribe-hint {
            font-size: 0.875rem;
            color: #666666;
            margin: 12px 0 0 0;
            padding: 12px 16px;
            background: #f5f5f5;
            border-radius: 12px;
          }


          .feed-header a {
            color: #e33d3d;
            text-decoration: none;
          }

          .feed-header a:hover {
            text-decoration: underline;
            text-decoration-style: wavy;
          }

          .item {
            padding: 0;
            margin-bottom: 32px;
          }

          .item:last-child {
            margin-bottom: 0;
          }

          .item-title {
            font-size: 1rem;
            font-weight: 500;
            margin: 0 0 4px 0;
          }

          .item-title a {
            color: #4d4d4d;
            text-decoration: none;
          }

          .item-title a:hover {
            color: #e33d3d;
          }

          .item-date {
            font-size: 0.8125rem;
            color: #999999;
            margin: 0 0 8px 0;
          }

          .item-description {
            font-size: 0.9375rem;
            color: #666666;
            margin: 0;
          }

          .item-image {
            width: 100%;
            border-radius: 12px;
            margin-bottom: 12px;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card feed-header">
            <h1>
              <svg class="rss-icon" viewBox="0 0 24 24" fill="#e33d3d" xmlns="http://www.w3.org/2000/svg"><circle cx="6.18" cy="17.82" r="2.18"/><path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"/></svg>
              <xsl:value-of select="/rss/channel/title" />
            </h1>
            <p><xsl:value-of select="/rss/channel/description" /></p>
            <p class="subscribe-hint">
              This is an RSS feed. Copy the URL from your browser's address bar into your feed reader to subscribe.
              Visit <a href="/feeds">the feeds page</a> for more feeds and reader suggestions.
            </p>
          </div>

          <div class="card">
            <xsl:for-each select="/rss/channel/item">
              <div class="item">
                <xsl:if test="media:content/@url">
                  <a>
                    <xsl:attribute name="href">
                      <xsl:value-of select="link" />
                    </xsl:attribute>
                    <img class="item-image">
                      <xsl:attribute name="src">
                        <xsl:value-of select="media:content/@url" />
                      </xsl:attribute>
                      <xsl:attribute name="alt">
                        <xsl:value-of select="title" />
                      </xsl:attribute>
                    </img>
                  </a>
                </xsl:if>
                <p class="item-title">
                  <a>
                    <xsl:attribute name="href">
                      <xsl:value-of select="link" />
                    </xsl:attribute>
                    <xsl:value-of select="title" />
                  </a>
                </p>
                <p class="item-date">
                  <xsl:value-of select="pubDate" />
                </p>
                <xsl:if test="description != ''">
                  <p class="item-description">
                    <xsl:value-of select="description" />
                  </p>
                </xsl:if>
              </div>
            </xsl:for-each>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
