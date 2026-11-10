/**
 * Busca web / mercado (DESIGN §3.2, B2) — INTERFACE + fail-closed até a Q3.
 * O provedor (Tavily/Serper/Brave) e o orçamento NÃO foram decididos pelo
 * Augusto; este arquivo NÃO inventa provedor nem chave: sem decisão, a fonte
 * de mercado fica indisponível por construção e a pesquisa registra isso em
 * sourcesUnavailable. Quando a Q3 for decidida, trocar esta classe pela
 * implementação real, mantendo a interface MarketResearchProvider.
 */
import { ProviderUnavailable, type JobMarketSignal, type MarketQuery, type MarketResearchProvider } from './providers';

export class WebSearchJobsProvider implements MarketResearchProvider {
  readonly id = 'jobs';

  async searchJobs(_query: MarketQuery): Promise<JobMarketSignal[]> {
    throw new ProviderUnavailable('jobs', 'provedor de busca web não escolhido (Q3 pendente) e sem chave configurada — fonte indisponível, sem dado inventado');
  }
}
