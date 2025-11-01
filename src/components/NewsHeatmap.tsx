'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface NewsHeatmapData {
  ticker: string;
  company?: string;
  articleCount: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -1.0 to 1.0
  priceChange: number;
  topHeadlines: string[];
  breakingNews?: boolean;
}

interface NewsHeatmapProps {
  data: NewsHeatmapData[];
  onTickerClick?: (ticker: string) => void;
}

export default function NewsHeatmap({ data, onTickerClick }: NewsHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<NewsHeatmapData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Handle responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = Math.min(600, Math.max(400, width * 0.5));
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const { width, height } = dimensions;

    // Create hierarchy
    const root = d3.hierarchy<{ children: NewsHeatmapData[] }>({ children: data })
      .sum(d => (d as any).articleCount || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap layout
    const treemap = d3.treemap<{ children: NewsHeatmapData[] }>()
      .size([width, height])
      .padding(2)
      .round(true);

    const treemapRoot = treemap(root);

    // Financial industry standard color scale (like Bloomberg, Finviz, TradingView)
    // Green for positive sentiment, Red for negative, with varying intensity
    const getSentimentColor = (sentiment: string, score: number) => {
      const absScore = Math.abs(score);
      
      if (sentiment === 'bullish') {
        // Green gradient: darker green for stronger bullish sentiment
        if (absScore > 0.6) return '#00C853'; // Strong green
        if (absScore > 0.4) return '#00E676'; // Medium green
        if (absScore > 0.2) return '#69F0AE'; // Light green
        return '#B9F6CA'; // Very light green
      } else if (sentiment === 'bearish') {
        // Red gradient: darker red for stronger bearish sentiment
        if (absScore > 0.6) return '#D32F2F'; // Strong red
        if (absScore > 0.4) return '#F44336'; // Medium red
        if (absScore > 0.2) return '#FF5252'; // Light red
        return '#FF8A80'; // Very light red
      } else {
        // Neutral: gray tones
        return '#607D8B'; // Blue-gray for neutral
      }
    };

    // Create cells
    const cells = svg
      .selectAll('g')
      .data(treemapRoot.leaves())
      .join('g')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer');

    // Add rectangles
    cells
      .append('rect')
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('fill', (d: any) => {
        const data = d.data as any as NewsHeatmapData;
        return getSentimentColor(data.sentiment, data.sentimentScore);
      })
      .attr('stroke', '#000000')
      .attr('stroke-width', 1)
      .attr('rx', 0)
      .style('transition', 'all 0.2s ease')
      .on('mouseover', function(event: any, d: any) {
        d3.select(this)
          .attr('stroke', '#FFFFFF')
          .attr('stroke-width', 2)
          .style('filter', 'brightness(1.2)');
        
        const data = d.data as any as NewsHeatmapData;
        setHoveredNode(data);
        setTooltipPos({ x: event.pageX, y: event.pageY });
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke', '#000000')
          .attr('stroke-width', 1)
          .style('filter', 'brightness(1)');
        
        setHoveredNode(null);
      })
      .on('click', (event: any, d: any) => {
        const data = d.data as any as NewsHeatmapData;
        if (onTickerClick) {
          onTickerClick(data.ticker);
        }
      });

    // Add breaking news pulse animation
    cells
      .filter((d: any) => (d.data as any).breakingNews)
      .append('circle')
      .attr('cx', (d: any) => (d.x1 - d.x0) - 10)
      .attr('cy', 10)
      .attr('r', 4)
      .attr('fill', '#ef4444')
      .style('animation', 'pulse 2s infinite');

    // Add ticker text
    cells
      .append('text')
      .attr('x', (d: any) => (d.x1 - d.x0) / 2)
      .attr('y', (d: any) => (d.y1 - d.y0) / 2 - 10)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', (d: any) => {
        const data = d.data as any as NewsHeatmapData;
        // Use black text on light backgrounds, white on dark
        if (data.sentiment === 'bullish' && Math.abs(data.sentimentScore) < 0.4) {
          return '#000000';
        } else if (data.sentiment === 'bearish' && Math.abs(data.sentimentScore) < 0.4) {
          return '#000000';
        }
        return '#ffffff';
      })
      .attr('font-size', (d: any) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        return Math.min(24, Math.max(10, Math.sqrt(area) / 8)) + 'px';
      })
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text((d: any) => (d.data as any).ticker);

    // Add article count
    cells
      .append('text')
      .attr('x', (d: any) => (d.x1 - d.x0) / 2)
      .attr('y', (d: any) => (d.y1 - d.y0) / 2 + 12)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', (d: any) => {
        const data = d.data as any as NewsHeatmapData;
        // Use contrasting text color
        if (data.sentiment === 'bullish' && Math.abs(data.sentimentScore) < 0.4) {
          return '#000000';
        } else if (data.sentiment === 'bearish' && Math.abs(data.sentimentScore) < 0.4) {
          return '#000000';
        }
        return 'rgba(255, 255, 255, 0.8)';
      })
      .attr('font-size', (d: any) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        const area = width * height;
        return Math.min(14, Math.max(8, Math.sqrt(area) / 12)) + 'px';
      })
      .attr('pointer-events', 'none')
      .text((d: any) => `${(d.data as any).articleCount} articles`);

    // Add price change
    cells
      .filter((d: any) => (d.x1 - d.x0) > 80 && (d.y1 - d.y0) > 60) // Only show on larger cells
      .append('text')
      .attr('x', (d: any) => (d.x1 - d.x0) / 2)
      .attr('y', (d: any) => (d.y1 - d.y0) / 2 + 28)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', (d: any) => {
        const data = d.data as any as NewsHeatmapData;
        // Financial standard: green for gains, red for losses
        return data.priceChange >= 0 ? '#00C853' : '#F44336';
      })
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text((d: any) => {
        const data = d.data as any as NewsHeatmapData;
        const sign = data.priceChange >= 0 ? '+' : '';
        return `${sign}${data.priceChange.toFixed(2)}%`;
      });

  }, [data, dimensions, onTickerClick]);

  return (
    <div ref={containerRef} className="relative w-full">
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
      
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-gray-950 rounded-lg"
      />

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 max-w-sm pointer-events-none"
          style={{
            left: `${tooltipPos.x + 10}px`,
            top: `${tooltipPos.y + 10}px`,
            transform: 'translate(0, -50%)',
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-lg">{hoveredNode.ticker}</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                hoveredNode.sentiment === 'bullish' ? 'bg-success/20 text-success' :
                hoveredNode.sentiment === 'bearish' ? 'bg-danger/20 text-danger' :
                'bg-gray-700 text-gray-300'
              }`}>
                {hoveredNode.sentiment === 'bullish' ? '🟢 Bullish' : 
                 hoveredNode.sentiment === 'bearish' ? '🔴 Bearish' : 
                 '🟡 Neutral'}
              </span>
            </div>
            
            {hoveredNode.company && (
              <p className="text-gray-400 text-sm">{hoveredNode.company}</p>
            )}

            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-300">
                <strong>{hoveredNode.articleCount}</strong> articles
              </span>
              <span className={hoveredNode.priceChange >= 0 ? 'text-success' : 'text-danger'}>
                {hoveredNode.priceChange >= 0 ? '+' : ''}{hoveredNode.priceChange.toFixed(2)}%
              </span>
            </div>

            {hoveredNode.topHeadlines && hoveredNode.topHeadlines.length > 0 && (
              <div className="border-t border-gray-700 pt-2 mt-2">
                <p className="text-gray-400 text-xs font-semibold mb-1">Top Headlines:</p>
                <ul className="space-y-1">
                  {hoveredNode.topHeadlines.slice(0, 3).map((headline, i) => (
                    <li key={i} className="text-gray-300 text-xs line-clamp-1">
                      • {headline}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-gray-500 text-xs mt-2">Click to view details →</p>
          </div>
        </div>
      )}
    </div>
  );
}
