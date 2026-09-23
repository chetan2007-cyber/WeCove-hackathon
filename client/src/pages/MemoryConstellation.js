import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, User, MapPin, Calendar, Rocket, RefreshCcw } from 'lucide-react';
import memoryService from '../services/memoryService';

export default function MemoryConstellation() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const patientId = user?._id || user?.id || '11111111-1111-1111-1111-111111111111';
        
        const data = await memoryService.getMemoryGraph(patientId);
        const loadedNodes = data.nodes || [];

        // If graph is empty, load healthy demo constellation nodes
        if (loadedNodes.length === 0) {
          setNodes([
            {
              _id: 'n-1',
              id: 'n-1',
              name: 'Ananya (Daughter)',
              entityType: 'Person',
              recognitionStrength: 9,
              relatedMemories: [
                { _id: 'm-1', caption: 'Trip to Umiam Lake, Shillong', mediaUrl: '/manus-storage/shillong_cd371abe.jpg' },
                { _id: 'm-3', caption: 'Morning tea in garden', mediaUrl: '/manus-storage/ananya_8d4ced56.jpg' }
              ]
            },
            {
              _id: 'n-2',
              id: 'n-2',
              name: 'Shillong & Umiam Lake',
              entityType: 'Place',
              recognitionStrength: 8,
              relatedMemories: [
                { _id: 'm-1', caption: 'Trip to Umiam Lake, Shillong', mediaUrl: '/manus-storage/shillong_cd371abe.jpg' }
              ]
            },
            {
              _id: 'n-3',
              id: 'n-3',
              name: 'Diwali Family Gathering',
              entityType: 'Event',
              recognitionStrength: 7,
              relatedMemories: [
                { _id: 'm-2', caption: 'Diwali celebration at home', mediaUrl: '/manus-storage/family_6e10bf6e.jpg' }
              ]
            }
          ]);
        } else {
          setNodes(loadedNodes);
        }

        if (loadedNodes.length > 0) {
          setSelectedNode(loadedNodes[0]);
        }
      } catch (err) {
        console.warn('Memory graph load fallback', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, []);

  const getEntityBadge = (type) => {
    switch (type) {
      case 'Person':
        return { icon: User, color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'Place':
        return { icon: MapPin, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'Event':
      default:
        return { icon: Calendar, color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-[#162D3D]">
        <div className="text-center">
          <RefreshCcw className="w-10 h-10 animate-spin text-[#0F7673] mx-auto mb-4" />
          <h2 className="font-serif text-2xl">Building Memory Constellation Graph...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-8 font-sans flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex justify-between items-center mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F7673]">Interactive Cognitive Map</span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-800">Memory Constellation</h1>
        </div>
        <button 
          onClick={() => navigate('/patient')}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-5 rounded-2xl border border-slate-200 text-sm shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back Home</span>
        </button>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {/* Constellation Nodes Column */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0F7673]" />
            <span>Connected Anchors</span>
          </h2>
          
          <div className="space-y-3 overflow-y-auto max-h-[550px] pr-1">
            {nodes.map((node) => {
              const badge = getEntityBadge(node.entityType);
              const BadgeIcon = badge.icon;
              const isSelected = (selectedNode?._id || selectedNode?.id) === (node._id || node.id);

              return (
                <div 
                  key={node._id || node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-4 rounded-2xl cursor-pointer transition border text-left ${
                    isSelected 
                      ? 'bg-[#E5F0EE] border-[#0F7673] shadow-sm' 
                      : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-base">{node.name}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-semibold ${badge.color}`}>
                      <BadgeIcon className="w-3 h-3" />
                      {node.entityType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {node.relatedMemories?.length || 1} connected moments
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Node Details & Connected Moments */}
        <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
          {selectedNode ? (
            <div>
              <div className="border-b border-slate-100 pb-5 mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0F7673]">
                    {selectedNode.entityType} Anchor
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-0.5">
                    {selectedNode.name}
                  </h2>
                </div>

                <button 
                  onClick={() => navigate(`/patient/memory-journey/${selectedNode._id || selectedNode.id}`)}
                  className="inline-flex items-center gap-2 bg-[#0F7673] hover:bg-[#0C625F] text-white font-semibold py-2.5 px-5 rounded-2xl text-sm transition shadow-sm"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Start Journey with {selectedNode.name}</span>
                </button>
              </div>

              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                Linked Photographic Memories
              </h3>

              {(!selectedNode.relatedMemories || selectedNode.relatedMemories.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500">
                  <p>Memories linked to this person or place will appear here as you upload photos in the vault.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedNode.relatedMemories.map((mem, idx) => (
                    <div key={mem._id || idx} className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 group hover:shadow-md transition">
                      <div className="h-44 overflow-hidden bg-slate-100">
                        <img 
                          src={mem.mediaUrl || '/manus-storage/shillong_cd371abe.jpg'} 
                          alt="Memory" 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                      <div className="p-3.5">
                        <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                          {mem.caption || "A special moment in time"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-12 text-slate-500">
              <p>Select an anchor from the constellation to view connected memories.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}