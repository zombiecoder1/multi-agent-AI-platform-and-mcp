import { AgentRole } from './types';
import { marketingAgent } from './marketingAgent';
import { techAgent } from './techAgent';
import { hrAgent } from './hrAgent';
import { aiAgent } from './aiAgent';
import { sarcasmAgent } from './sarcasmAgent';

// Direct imports from individual agent files
export const agentRegistry: AgentRole[] = [
  marketingAgent,
  techAgent,
  hrAgent,
  aiAgent,
  sarcasmAgent,
];

export const getAgentById = (id: string): AgentRole | undefined => {
  return agentRegistry.find(agent => agent.id === id);
};

export const getAllAgents = (): AgentRole[] => {
  return agentRegistry;
};

export const getAgentBySpecialization = (specialization: string): AgentRole | undefined => {
  return agentRegistry.find(agent => 
    agent.specialization.toLowerCase().includes(specialization.toLowerCase())
  );
};
