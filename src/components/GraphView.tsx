import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

import { Note } from '../services/storage';

interface GraphViewProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
}

export default function GraphView({ notes, onSelectNote }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || notes.length === 0 || dimensions.width === 0) return;

    const width = dimensions.width;
    const height = dimensions.height;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    // 1. Prepare Nodes
    // Extract unique folders (excluding Root/default)
    const folders = Array.from(new Set(notes.map(n => n.folder || 'Root')))
      .filter(f => f !== '/' && f !== 'Root');
    
    // Create Folder Nodes
    const folderNodes = folders.map(f => ({
      id: `folder-${f}`,
      title: f,
      type: 'folder',
      group: 'folder',
      // Dummy props to satisfy type if needed, or cast to any
      content: '',
      tags: '',
      folder: '',
      is_guide: 0
    }));

    // Create Note Nodes
    const noteNodes = notes.map(n => ({ 
      id: n.id, 
      title: n.title, 
      type: 'note',
      group: n.folder || 'Root',
      ...n 
    }));

    const nodes = [...folderNodes, ...noteNodes];

    // 2. Prepare Links
    const links: any[] = [];

    // Link: Note -> Folder (Hierarchy)
    noteNodes.forEach(n => {
      const folderName = n.group;
      // Only connect to folder if it's not Root
      if (folderName !== '/' && folderName !== 'Root') {
        links.push({ source: `folder-${folderName}`, target: n.id, type: 'hierarchy' });
      }
    });

    // Link: Note -> Note (WikiLinks)
    notes.forEach(source => {
      const regex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = regex.exec(source.content)) !== null) {
        const targetTitle = match[1];
        const target = notes.find(n => n.title === targetTitle);
        if (target) {
          links.push({ source: source.id, target: target.id, type: 'mention' });
        }
      }
    });

    // Calculate node degree (number of connections)
    const nodeDegree: Record<string, number> = {};
    nodes.forEach(n => { nodeDegree[n.id] = 0; });
    links.forEach(l => {
      nodeDegree[l.source] += 1;
      nodeDegree[l.target] += 1;
    });

    // Force Simulation
    const outerRadius = Math.min(width, height) / 2 * 0.85;

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance((d: any) => d.type === 'hierarchy' ? 50 : 80))
      .force('charge', d3.forceManyBody().strength((d: any) => nodeDegree[d.id] === 0 ? -15 : -150))
      .force('collide', d3.forceCollide().radius((d: any) => (d.type === 'folder' ? 15 : 5) + (nodeDegree[d.id] || 0) + 2).iterations(2))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('radial', d3.forceRadial(
          (d: any) => nodeDegree[d.id] === 0 ? outerRadius : 0,
          width / 2,
          height / 2
        ).strength((d: any) => nodeDegree[d.id] === 0 ? 0.8 : 0.05)
      );

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height]);

    // Group for zoomable content
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Draw Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => d.type === 'hierarchy' ? '#ffffff' : '#a5b4fc') // Hierarchy white, mention indigo
      .attr('stroke-opacity', (d: any) => d.type === 'hierarchy' ? 0.1 : 0.2)
      .attr('stroke-width', (d: any) => d.type === 'hierarchy' ? 1 : 1.5)
      .attr('stroke-dasharray', (d: any) => d.type === 'hierarchy' ? '3,3' : 'none'); // Dashed for hierarchy

    // Draw Nodes Group
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(drag(simulation) as any);

    // Node Circles
    const circles = node.append('circle')
      .attr('r', (d: any) => {
        if (nodeDegree[d.id] === 0) return 3; // Small dots for orphans
        const base = d.type === 'folder' ? 12 : 6;
        return base + Math.min((nodeDegree[d.id] || 0) * 1.2, 20);
      })
      .attr('fill', (d: any) => {
        if (nodeDegree[d.id] === 0) return 'rgba(255, 255, 255, 0.1)'; // Darker grey for orphans
        return d.type === 'folder' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)';
      }) 
      .attr('stroke', (d: any) => nodeDegree[d.id] === 0 ? 'none' : 'rgba(255, 255, 255, 0.2)')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
      .attr('class', 'transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.5)]');

    // Node Labels
    const labels = node.append('text')
      .text((d: any) => d.title)
      .attr('x', (d: any) => (d.type === 'folder' ? 14 : 10) + Math.min((nodeDegree[d.id] || 0) * 1.2, 20))
      .attr('y', 4)
      .attr('font-size', (d: any) => d.type === 'folder' ? '12px' : '10px')
      .attr('fill', (d: any) => d.type === 'folder' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)')
      .attr('font-weight', (d: any) => d.type === 'folder' ? '600' : '400')
      .style('pointer-events', 'none')
      .style('opacity', (d: any) => (d.type === 'folder' || nodeDegree[d.id] > 0 ? 1 : 0))
      .style('text-shadow', '0 0 10px rgba(0,0,0,0.5)');

    // Interactions
    node.on('click', (event, d: any) => {
      if (d.type === 'note') {
        onSelectNote(d);
      }
    });

    // Hover Effect
    node.on('mouseover', function(event, d: any) {
      // 1. Fade out everything
      link.transition().duration(200).style('stroke-opacity', 0.05);
      node.transition().duration(200).style('opacity', 0.2);
      
      // 2. Identify connected nodes
      const connectedNodeIds = new Set();
      connectedNodeIds.add(d.id);
      
      // 3. Highlight connected links
      link.filter((l: any) => {
        if (l.source.id === d.id || l.target.id === d.id) {
          connectedNodeIds.add(l.source.id);
          connectedNodeIds.add(l.target.id);
          return true;
        }
        return false;
      })
      .transition().duration(200)
      .style('stroke-opacity', 0.6)
      .attr('stroke', '#ffffff');

      // 4. Highlight connected nodes
      node.filter((n: any) => connectedNodeIds.has(n.id))
        .transition().duration(200)
        .style('opacity', 1);
        
      // Show labels
      node.filter((n: any) => connectedNodeIds.has(n.id))
        .select('text')
        .style('opacity', 1)
        .attr('fill', '#ffffff');

      // 5. Highlight current node
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('fill', '#ffffff')
        .attr('r', (d: any) => {
           if (nodeDegree[d.id] === 0) return 6;
           const base = d.type === 'folder' ? 14 : 8;
           return base + Math.min((nodeDegree[d.id] || 0) * 1.2, 20);
        });
        
      d3.select(this).select('text')
        .style('opacity', 1)
        .attr('fill', '#ffffff')
        .attr('font-weight', '600');
    })
    .on('mouseout', function(event, d: any) {
      // Reset styles
      link.transition().duration(200)
        .style('stroke-opacity', (d: any) => d.type === 'hierarchy' ? 0.1 : 0.2)
        .attr('stroke', (d: any) => d.type === 'hierarchy' ? '#ffffff' : '#a5b4fc');
        
      node.transition().duration(200).style('opacity', 1);
      
      // Reset labels
      node.select('text')
        .style('opacity', (d: any) => (d.type === 'folder' || nodeDegree[d.id] > 0 ? 1 : 0))
        .attr('fill', (d: any) => d.type === 'folder' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)')
        .attr('font-weight', (d: any) => d.type === 'folder' ? '600' : '400');
      
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('fill', (d: any) => {
          if (nodeDegree[d.id] === 0) return 'rgba(255, 255, 255, 0.1)';
          return d.type === 'folder' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)';
        })
        .attr('r', (d: any) => {
          if (nodeDegree[d.id] === 0) return 3;
          const base = d.type === 'folder' ? 12 : 6;
          return base + Math.min((nodeDegree[d.id] || 0) * 1.2, 20);
        });
    });

    // Simulation Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag Behavior
    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }

  }, [notes, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full bg-transparent rounded-xl overflow-hidden relative group">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      
      {/* Stats Overlay */}
      <div className="absolute bottom-4 right-4 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium text-white/60 border border-white/10 shadow-lg pointer-events-none select-none flex items-center gap-2">
        <span>{notes.length} заметок</span>
        <span className="w-1 h-1 bg-white/40 rounded-full" />
        <span>
          {notes.reduce((acc, n) => {
             const regex = /\[\[(.*?)\]\]/g;
             const matches = n.content.match(regex);
             return acc + (matches ? matches.length : 0);
          }, 0)} связей
        </span>
      </div>
    </div>
  );
}
