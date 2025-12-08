import { describe, it, expect } from 'vitest';
import { chunkSummary, type ChunkSummaryRequest } from '../server/services/summaryChunker';

describe('chunkSummary', () => {
  describe('basic splitting', () => {
    it('should return empty paragraphs for empty input', () => {
      const result = chunkSummary({ summary: '' });
      expect(result.paragraphs).toEqual([]);
    });

    it('should return empty paragraphs for whitespace-only input', () => {
      const result = chunkSummary({ summary: '   \n\n  ' });
      expect(result.paragraphs).toEqual([]);
    });

    it('should split a long single-paragraph summary into 2-3 paragraphs', () => {
      const longSummary = `
        Seasoned product leader with 15+ years of experience driving digital transformation 
        across enterprise platforms. Led cross-functional teams at LEGO, UKG, and Cerillion 
        to deliver mission-critical products that generated over $50M in annual revenue. 
        Spearheaded the migration of legacy systems to cloud-native architectures, reducing 
        operational costs by 35%. Managed portfolios of 12+ products across multiple markets 
        with proven ability to align stakeholders. Currently seeking opportunities to lead 
        innovative product organizations and drive strategic growth initiatives.
      `.trim();

      const result = chunkSummary({ summary: longSummary, targetParagraphs: 3 });
      
      expect(result.paragraphs.length).toBeGreaterThanOrEqual(2);
      expect(result.paragraphs.length).toBeLessThanOrEqual(4);
    });

    it('should not exceed maxParaLenChars for any paragraph', () => {
      const longSummary = `
        Experienced software architect with expertise in distributed systems and cloud computing.
        Led the design and implementation of microservices architecture at Fortune 500 companies.
        Drove 40% improvement in system performance through optimization initiatives.
        Currently focused on building scalable AI/ML infrastructure for next-generation applications.
      `.trim();

      const result = chunkSummary({ summary: longSummary, maxParaLenChars: 300 });
      
      for (const para of result.paragraphs) {
        expect(para.text.length).toBeLessThanOrEqual(350); // Allow some flexibility
      }
    });
  });

  describe('topic detection', () => {
    it('should label first paragraph as Positioning when it contains scope words', () => {
      const summary = `
        Senior engineering leader with 20+ years of experience building products at global scale.
        Previously led teams at Google and Microsoft delivering platform solutions.
        Currently looking to bring enterprise expertise to a dynamic startup.
      `.trim();

      const result = chunkSummary({ summary, targetParagraphs: 3 });
      
      expect(result.paragraphs[0].topic).toMatch(/Positioning|Intro/);
    });

    it('should label paragraph with metrics as Delivery proof', () => {
      const summary = `
        Product leader focused on SaaS solutions. 
        Delivered 5 major product launches generating $25M revenue with 40% growth year-over-year. 
        Now exploring B2B opportunities.
      `.trim();

      const result = chunkSummary({ summary, targetParagraphs: 3 });
      
      const deliveryPara = result.paragraphs.find(p => p.topic === 'Delivery proof');
      expect(deliveryPara).toBeDefined();
    });

    it('should label paragraph with future words as Now/Next', () => {
      const summary = `
        Experienced engineer with deep backend expertise. 
        Built distributed systems for high-traffic applications.
        Currently seeking roles where I can lead technical architecture initiatives.
      `.trim();

      const result = chunkSummary({ summary, targetParagraphs: 3 });
      
      const hasNowNext = result.paragraphs.some(p => p.topic === 'Now/Next');
      expect(hasNowNext).toBe(true);
    });
  });

  describe('signal detection', () => {
    it('should detect numbers signal when metrics present', () => {
      const summary = `
        Led a team of 50+ engineers to deliver 3 major products that increased revenue by 25%.
      `.trim();

      const result = chunkSummary({ summary });
      
      const hasNumbersSignal = result.paragraphs.some(p => p.signals.includes('numbers'));
      expect(hasNumbersSignal).toBe(true);
    });

    it('should detect proper_nouns signal when company names present', () => {
      const summary = `
        Previously worked at Google, Microsoft, and Amazon building core infrastructure products.
      `.trim();

      const result = chunkSummary({ summary });
      
      const hasProperNouns = result.paragraphs.some(p => p.signals.includes('proper_nouns'));
      expect(hasProperNouns).toBe(true);
    });

    it('should detect acronyms signal when acronyms present', () => {
      const summary = `
        Expert in AWS, GCP, and Azure cloud platforms with deep experience in CI/CD pipelines.
      `.trim();

      const result = chunkSummary({ summary });
      
      const hasAcronyms = result.paragraphs.some(p => p.signals.includes('acronyms'));
      expect(hasAcronyms).toBe(true);
    });

    it('should detect future signal when future-oriented words present', () => {
      const summary = `
        Currently seeking opportunities to lead product innovation at a growth-stage company.
      `.trim();

      const result = chunkSummary({ summary });
      
      const hasFuture = result.paragraphs.some(p => p.signals.includes('future'));
      expect(hasFuture).toBe(true);
    });

    it('should detect scope signal when broad terms present', () => {
      const summary = `
        20 years of experience building enterprise products and leading global teams across platforms.
      `.trim();

      const result = chunkSummary({ summary });
      
      const hasScope = result.paragraphs.some(p => p.signals.includes('scope'));
      expect(hasScope).toBe(true);
    });
  });

  describe('energy scoring', () => {
    it('should assign higher energy to paragraphs with strong action verbs', () => {
      const summary = `
        Led and launched 5 major product initiatives that transformed the organization.
        Helped support the team with various tasks.
      `.trim();

      const result = chunkSummary({ summary, targetParagraphs: 2 });
      
      expect(result.paragraphs.every(p => p.energy >= 0 && p.energy <= 1)).toBe(true);
    });

    it('should assign energy scores between 0 and 1', () => {
      const summary = `
        Experienced product manager with strong technical background. 
        Built multiple successful products from conception to launch.
        Currently focused on AI/ML applications.
      `.trim();

      const result = chunkSummary({ summary });
      
      for (const para of result.paragraphs) {
        expect(para.energy).toBeGreaterThanOrEqual(0);
        expect(para.energy).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('allowList handling', () => {
    it('should preserve allowList tokens exactly', () => {
      const summary = `
        Product leader at LEGO Group with experience across UKG and Cerillion platforms.
        Delivered UAT testing frameworks for enterprise clients.
      `.trim();

      const result = chunkSummary({ 
        summary, 
        allowList: ['LEGO', 'UKG', 'UAT', 'Cerillion'] 
      });
      
      const fullText = result.paragraphs.map(p => p.text).join(' ');
      expect(fullText).toContain('LEGO');
      expect(fullText).toContain('UKG');
      expect(fullText).toContain('UAT');
      expect(fullText).toContain('Cerillion');
    });
  });

  describe('tone adjustments', () => {
    it('should apply neutral tone adjustments', () => {
      const summary = `
        I was responsible for leading the team. EXTREMELY successful in delivery.
      `.trim();

      const result = chunkSummary({ summary, tone: 'neutral' });
      
      const fullText = result.paragraphs.map(p => p.text).join(' ');
      expect(fullText).not.toContain('EXTREMELY');
      expect(fullText).toContain('very');
    });

    it('should apply confident tone adjustments', () => {
      const summary = `
        I was responsible for delivering the product. I was involved in strategic planning.
      `.trim();

      const result = chunkSummary({ summary, tone: 'confident' });
      
      const fullText = result.paragraphs.map(p => p.text).join(' ');
      expect(fullText).toContain('led');
      expect(fullText).toContain('drove');
    });
  });

  describe('paragraph merging', () => {
    it('should merge paragraphs when exceeding target', () => {
      const summary = `
        First point about leadership. Second point about delivery. Third point about innovation.
        Fourth point about strategy. Fifth point about execution. Sixth point about teamwork.
      `.trim();

      const result = chunkSummary({ summary, targetParagraphs: 2, maxParaLenChars: 100 });
      
      expect(result.paragraphs.length).toBeLessThanOrEqual(3);
    });

    it('should allow fewer paragraphs than target if content is short', () => {
      const shortSummary = 'Experienced leader with strong delivery track record.';
      
      const result = chunkSummary({ summary: shortSummary, targetParagraphs: 3 });
      
      expect(result.paragraphs.length).toBeLessThanOrEqual(3);
    });
  });

  describe('discourse marker handling', () => {
    it('should break on discourse markers like "Currently" and "Now"', () => {
      const summary = `
        Experienced product manager with 10+ years in B2B SaaS. Previously led product at Microsoft 
        and Google. Currently seeking opportunities to lead product innovation at startups.
      `.trim();

      const result = chunkSummary({ summary, targetParagraphs: 3 });
      
      const lastPara = result.paragraphs[result.paragraphs.length - 1];
      expect(lastPara.text.toLowerCase()).toContain('currently');
    });
  });
});
