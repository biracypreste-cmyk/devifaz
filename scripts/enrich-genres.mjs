#!/usr/bin/env node
/**
 * Script para enriquecer real_content.json com gêneros do TMDB
 * 
 * Uso: node scripts/enrich-genres.mjs
 * 
 * Este script:
 * 1. Lê public/data/real_content.json
 * 2. Para cada item, busca no TMDB por título + tipo (movie/tv)
 * 3. Adiciona genre_ids e genres ao item
 * 4. Salva o JSON atualizado
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API Keys do TMDB (rotação para evitar limites)
const TMDB_API_KEYS = [
  'ddb1bdf6aa91bdf335797853884b0c1d',
  'aa1d921feb99069e464f5f713c415ffd',
  '4b12d53d4c9a299cd1b5b425ee26336a',
];

let currentKeyIndex = 0;
let requestCount = 0;
const REQUESTS_PER_KEY = 35;

function getNextApiKey() {
  requestCount++;
  if (requestCount >= REQUESTS_PER_KEY) {
    requestCount = 0;
    currentKeyIndex = (currentKeyIndex + 1) % TMDB_API_KEYS.length;
    console.log(`🔄 Rotacionando para API Key ${currentKeyIndex + 1}/${TMDB_API_KEYS.length}`);
  }
  return TMDB_API_KEYS[currentKeyIndex];
}

// Mapa de gêneros TMDB (ID -> Nome em português)
const GENRE_MAP = {
  // Filmes
  28: 'Ação',
  12: 'Aventura',
  16: 'Animação',
  35: 'Comédia',
  80: 'Crime',
  99: 'Documentário',
  18: 'Drama',
  10751: 'Família',
  14: 'Fantasia',
  36: 'História',
  27: 'Terror',
  10402: 'Música',
  9648: 'Mistério',
  10749: 'Romance',
  878: 'Ficção Científica',
  10770: 'Cinema TV',
  53: 'Thriller',
  10752: 'Guerra',
  37: 'Faroeste',
  // Séries
  10759: 'Ação & Aventura',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

const TMDB_BASE = 'https://api.themoviedb.org/3';

async function searchTMDB(title, mediaType) {
  const apiKey = getNextApiKey();
  const searchType = mediaType === 'tv' ? 'tv' : 'movie';
  const url = `${TMDB_BASE}/search/${searchType}?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(title)}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`⚠️ Erro na busca de "${title}": ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.results && data.results.length > 0 ? data.results[0] : null;
  } catch (error) {
    console.warn(`⚠️ Erro ao buscar "${title}":`, error.message);
    return null;
  }
}

async function enrichItem(item) {
  const title = item.title || item.name;
  const mediaType = item.type || item.media_type;
  
  const result = await searchTMDB(title, mediaType);
  
  if (result && result.genre_ids && result.genre_ids.length > 0) {
    // Converter genre_ids para nomes
    const genres = result.genre_ids
      .map(id => GENRE_MAP[id])
      .filter(name => name);
    
    return {
      ...item,
      genre_ids: result.genre_ids,
      genres: genres,
    };
  }
  
  return item;
}

async function main() {
  const inputPath = path.join(__dirname, '..', 'public', 'data', 'real_content.json');
  const outputPath = inputPath; // Sobrescrever o mesmo arquivo
  
  console.log('📂 Lendo real_content.json...');
  const content = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  console.log(`✅ ${content.length} itens carregados`);
  
  const BATCH_SIZE = 5;
  const DELAY_MS = 500; // 500ms entre lotes para respeitar rate limit
  
  const enriched = [];
  let matched = 0;
  let unmatched = 0;
  
  console.log('\n🔄 Enriquecendo com gêneros do TMDB...\n');
  
  for (let i = 0; i < content.length; i += BATCH_SIZE) {
    const batch = content.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(item => enrichItem(item)));
    
    for (const result of results) {
      enriched.push(result);
      if (result.genres && result.genres.length > 0) {
        matched++;
      } else {
        unmatched++;
      }
    }
    
    // Progresso
    const progress = Math.min(i + BATCH_SIZE, content.length);
    const percent = ((progress / content.length) * 100).toFixed(1);
    process.stdout.write(`\r   Progresso: ${progress}/${content.length} (${percent}%) - ${matched} com gênero, ${unmatched} sem gênero`);
    
    // Delay entre lotes
    if (i + BATCH_SIZE < content.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log('\n\n📝 Salvando JSON atualizado...');
  fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2), 'utf-8');
  
  console.log('\n✅ ═══════════════════════════════════════════════════');
  console.log(`✅ ENRIQUECIMENTO COMPLETO!`);
  console.log(`   Total: ${enriched.length} itens`);
  console.log(`   Com gênero: ${matched} (${((matched / enriched.length) * 100).toFixed(1)}%)`);
  console.log(`   Sem gênero: ${unmatched} (${((unmatched / enriched.length) * 100).toFixed(1)}%)`);
  console.log('✅ ═══════════════════════════════════════════════════');
}

main().catch(console.error);
