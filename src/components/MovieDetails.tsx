import { useState, useEffect } from 'react';
import { Movie, getDetails, getSeason, getImageUrl, getTitle } from '../utils/tmdb';
import { OptimizedImage } from './OptimizedImage';
import { UniversalPlayer } from './UniversalPlayer';

// Icons inline to avoid lucide-react dependency
const Play = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const Info = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const Heart = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

const ArrowLeft = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const Star = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const Calendar = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const Clock = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  episode_number: number;
  runtime: number;
  air_date: string;
  vote_average: number;
}

interface Season {
  id: number;
  name: string;
  overview: string;
  episode_count: number;
  season_number: number;
  episodes: Episode[];
  air_date?: string;
}

interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface Genre {
  id: number;
  name: string;
}

export function MovieDetails({ movie, onClose, onActorClick, onPlayMovie }: { 
  movie: Movie; 
  onClose: () => void; 
  onActorClick?: (actorId: number, actorName: string) => void;
  onPlayMovie?: (movie: Movie) => void;
}) {
  const [details, setDetails] = useState<any>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [cast, setCast] = useState<Cast[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [showUniversalPlayer, setShowUniversalPlayer] = useState(false);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);

  // ✅ DETECÇÃO CORRETA DO TIPO DE MÍDIA - MELHORADA
  // Prioridade de detecção:
  // 1. Se tem media_type explícito, usar ele
  // 2. Se tem first_air_date OU name (sem title), é série
  // 3. Se tem release_date OU title (sem name), é filme
  // 4. Fallback: verificar no objeto completo
  let mediaType: 'tv' | 'movie' = 'movie';
  
  if (movie.media_type) {
    // TMDB às vezes retorna media_type explícito
    mediaType = movie.media_type === 'tv' ? 'tv' : 'movie';
  } else if (movie.first_air_date && !movie.release_date) {
    // Tem data de exibição, mas não data de lançamento = série
    mediaType = 'tv';
  } else if (movie.release_date && !movie.first_air_date) {
    // Tem data de lançamento, mas não data de exibição = filme
    mediaType = 'movie';
  } else if (movie.name && !movie.title) {
    // Tem name mas não title = série
    mediaType = 'tv';
  } else if (movie.title && !movie.name) {
    // Tem title mas não name = filme
    mediaType = 'movie';
  }

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        
        console.log('🎬 MovieDetails - Carregando detalhes do TMDB:', {
          id: movie.id,
          title: movie.title || movie.name,
          mediaType: mediaType,
        });
        
        // Usar streamUrl que vem do objeto movie
        if ((movie as any).streamUrl) {
          console.log('✅ Stream URL encontrada no objeto movie:', (movie as any).streamUrl);
          setStreamUrl((movie as any).streamUrl);
        }
        
        // Validar ID antes de buscar
        if (!movie.id || Number(movie.id) <= 0) {
          console.warn('⚠️ Invalid movie ID, skipping fetch');
          setLoading(false);
          return;
        }
        
        // Fetch detalhes completos do TMDB com append_to_response
        const detailsData = await getDetails(mediaType, Number(movie.id));
        setDetails(detailsData);
        
        // Extrair backdrop em alta resolucao do TMDB (NAO usar imagens locais)
        if (detailsData.backdrop_path) {
          setBackdropUrl(getImageUrl(detailsData.backdrop_path, 'original'));
        } else if (detailsData.poster_path) {
          setBackdropUrl(getImageUrl(detailsData.poster_path, 'original'));
        }
        
        // Extrair generos do TMDB
        if (detailsData.genres) {
          setGenres(detailsData.genres);
        }
        
        // Extrair logo das imagens do TMDB
        if (detailsData.images?.logos) {
          const logoImage = detailsData.images.logos.find((l: any) => l.iso_639_1 === 'pt') || 
                           detailsData.images.logos.find((l: any) => l.iso_639_1 === 'en') || 
                           detailsData.images.logos[0];
          if (logoImage) {
            setLogo(logoImage.file_path);
          }
        }
        
        // Extrair elenco completo do TMDB
        if (detailsData.credits?.cast) {
          setCast(detailsData.credits.cast.slice(0, 20));
        }
        
        // Extrair trailer do TMDB
        if (detailsData.videos?.results) {
          const trailer = detailsData.videos.results.find((v: any) => 
            v.type === 'Trailer' && v.site === 'YouTube'
          ) || detailsData.videos.results[0];
          if (trailer) {
            setTrailerKey(trailer.key);
          }
        }
        
        // Se for serie, processar temporadas do TMDB
        if (mediaType === 'tv' && detailsData.seasons) {
          const validSeasons = detailsData.seasons.filter((s: any) => s.season_number > 0);
          console.log('📺 Temporadas do TMDB:', validSeasons.length);
          setSeasons(validSeasons);
          
          // Buscar episodios da primeira temporada
          if (validSeasons.length > 0) {
            try {
              const seasonData = await getSeason(Number(movie.id), 1);
              setCurrentSeason(seasonData);
            } catch (error) {
              console.error('❌ Erro ao buscar temporada 1:', error);
            }
          }
        }
        
        setLoading(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('Not found')) {
          console.error('❌ Error fetching movie details:', error);
        }
        setLoading(false);
      }
    }
    
    fetchDetails();
  }, [movie.id, mediaType]);

  useEffect(() => {
    async function fetchSeasonEpisodes() {
      if (mediaType === 'tv' && selectedSeason > 0) {
        try {
          console.log(`📺 Buscando temporada ${selectedSeason} do TMDB...`);
          const seasonData = await getSeason(Number(movie.id), selectedSeason);
          setCurrentSeason(seasonData);
        } catch (error) {
          console.error(`❌ Error fetching season ${selectedSeason}:`, error);
        }
      }
    }
    
    fetchSeasonEpisodes();
  }, [selectedSeason, movie.id, mediaType]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white/80 text-lg">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  // Helper functions
  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const getReleaseYear = () => {
    const date = details?.release_date || details?.first_air_date;
    return date ? new Date(date).getFullYear() : null;
  };

  const handlePlayClick = () => {
    // Usar streamUrl do objeto movie para o botao Assistir
    if (onPlayMovie && streamUrl) {
      console.log('🎬 Abrindo Player com streamUrl:', streamUrl);
      onPlayMovie({ ...movie, streamUrl });
      return;
    }
    setShowUniversalPlayer(true);
  };

  const handleEpisodePlay = (_episodeNumber: number, _seasonNumber: number) => {
    console.log('🎬 Reproduzindo episodio...');
    setShowUniversalPlayer(true);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
      {/* Universal Player */}
      {showUniversalPlayer && (
        <UniversalPlayer
          movie={movie}
          streamUrl={streamUrl}
          trailerUrl={trailerKey}
          onClose={() => setShowUniversalPlayer(false)}
        />
      )}
      
      {/* Hero Section com Backdrop HD do TMDB */}
      <div className="relative min-h-[85vh]">
        {/* Backdrop em alta resolucao do TMDB */}
        {backdropUrl && (
          <div className="absolute inset-0">
            <OptimizedImage
              src={backdropUrl}
              alt={getTitle(movie)}
              priority={true}
              width={1920}
              height={1080}
              quality={95}
              useProxy={true}
              className="w-full h-full object-cover"
            />
            {/* Gradientes para efeito premium */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
          </div>
        )}
        
        {/* Botao Voltar com efeito de vidro */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Voltar</span>
        </button>
        
        {/* Conteudo Principal */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 lg:p-16">
          <div className="max-w-4xl">
            {/* Logo ou Titulo */}
            {logo ? (
              <div className="mb-6">
                <img 
                  src={getImageUrl(logo, 'w500')} 
                  alt={getTitle(movie)}
                  className="max-w-[350px] max-h-[140px] object-contain drop-shadow-2xl"
                />
              </div>
            ) : (
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg">
                {getTitle(movie)}
              </h1>
            )}
            
            {/* Cards de Metadados com Efeito de Vidro */}
            <div className="flex flex-wrap gap-3 mb-6">
              {/* Rating */}
              {details?.vote_average > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/10 border border-white/20">
                  <Star size={16} className="text-yellow-400" />
                  <span className="text-white font-semibold">{details.vote_average.toFixed(1)}</span>
                </div>
              )}
              
              {/* Ano */}
              {getReleaseYear() && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/10 border border-white/20">
                  <Calendar size={16} className="text-white/70" />
                  <span className="text-white">{getReleaseYear()}</span>
                </div>
              )}
              
              {/* Duracao (filmes) ou Temporadas (series) */}
              {mediaType === 'movie' && details?.runtime > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/10 border border-white/20">
                  <Clock size={16} className="text-white/70" />
                  <span className="text-white">{formatRuntime(details.runtime)}</span>
                </div>
              )}
              {mediaType === 'tv' && details?.number_of_seasons > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/10 border border-white/20">
                  <span className="text-white">
                    {details.number_of_seasons} {details.number_of_seasons === 1 ? 'Temporada' : 'Temporadas'}
                  </span>
                </div>
              )}
              
              {/* Generos do TMDB */}
              {genres.length > 0 && genres.slice(0, 3).map((genre) => (
                <div 
                  key={genre.id}
                  className="px-4 py-2 rounded-full backdrop-blur-md bg-white/10 border border-white/20"
                >
                  <span className="text-white/90">{genre.name}</span>
                </div>
              ))}
            </div>
            
            {/* Sinopse */}
            {details?.overview && (
              <p className="text-white/80 text-base md:text-lg leading-relaxed max-w-3xl mb-8 line-clamp-4">
                {details.overview}
              </p>
            )}
            
            {/* Botoes de Acao com Efeito de Vidro */}
            <div className="flex flex-wrap gap-4">
              {/* Botao Assistir - usa streamUrl do item */}
              <button 
                onClick={handlePlayClick}
                className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold text-lg transition-all duration-300 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:scale-105"
              >
                <Play size={24} fill="white" />
                <span>Assistir</span>
              </button>
              
              {/* Botao Trailer */}
              {trailerKey && (
                <button 
                  onClick={() => setShowUniversalPlayer(true)}
                  className="flex items-center gap-3 px-6 py-4 backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-white font-semibold transition-all duration-300 hover:scale-105"
                >
                  <Info size={20} />
                  <span>Trailer</span>
                </button>
              )}
              
              {/* Botao Favoritos */}
              <button className="flex items-center justify-center w-14 h-14 backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-white transition-all duration-300 hover:scale-110">
                <Heart size={22} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Secao de Conteudo com Efeito de Vidro */}
      <div className="relative bg-gradient-to-b from-black to-zinc-900 px-8 md:px-12 lg:px-16 py-12">
        
        {/* Informacoes Adicionais - Card de Vidro */}
        {details && (
          <div className="mb-12 p-6 rounded-2xl backdrop-blur-md bg-white/5 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Informacoes</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {details.original_title && details.original_title !== getTitle(movie) && (
                <div>
                  <p className="text-white/50 text-sm mb-1">Titulo Original</p>
                  <p className="text-white">{details.original_title || details.original_name}</p>
                </div>
              )}
              {details.status && (
                <div>
                  <p className="text-white/50 text-sm mb-1">Status</p>
                  <p className="text-white">{details.status}</p>
                </div>
              )}
              {details.original_language && (
                <div>
                  <p className="text-white/50 text-sm mb-1">Idioma Original</p>
                  <p className="text-white uppercase">{details.original_language}</p>
                </div>
              )}
              {details.production_companies && details.production_companies.length > 0 && (
                <div>
                  <p className="text-white/50 text-sm mb-1">Producao</p>
                  <p className="text-white">{details.production_companies.slice(0, 2).map((c: any) => c.name).join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Elenco Principal - Cards de Vidro */}
        {cast.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Elenco Principal</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {cast.map((actor) => (
                <div 
                  key={actor.id} 
                  className="flex-shrink-0 w-[140px] group cursor-pointer"
                  onClick={() => onActorClick?.(actor.id, actor.name)}
                >
                  <div className="relative rounded-xl overflow-hidden backdrop-blur-md bg-white/5 border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105">
                    <div className="aspect-[2/3] overflow-hidden">
                      {actor.profile_path ? (
                        <OptimizedImage
                          src={getImageUrl(actor.profile_path, 'w300')}
                          alt={actor.name}
                          width={140}
                          height={210}
                          quality={85}
                          useProxy={true}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <svg className="w-12 h-12 text-white/20" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3 backdrop-blur-md bg-black/50">
                      <p className="text-white font-medium text-sm truncate">{actor.name}</p>
                      <p className="text-white/60 text-xs truncate">{actor.character}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Temporadas e Episodios para Series - Cards de Vidro */}
        {mediaType === 'tv' && seasons.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Episodios</h2>
            
            {/* Seletor de Temporada com Efeito de Vidro */}
            <div className="mb-6">
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                className="px-6 py-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white font-medium min-w-[200px] focus:outline-none focus:border-white/40 transition-colors cursor-pointer"
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.season_number} className="bg-zinc-900">
                    Temporada {season.season_number}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Info da Temporada */}
            {currentSeason?.overview && (
              <div className="mb-6 p-4 rounded-xl backdrop-blur-md bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-2">{currentSeason.name}</h3>
                <p className="text-white/70 text-sm">{currentSeason.overview}</p>
                <div className="flex gap-4 mt-3 text-sm text-white/50">
                  {currentSeason.air_date && (
                    <span>Lancamento: {new Date(currentSeason.air_date).getFullYear()}</span>
                  )}
                  <span>{currentSeason.episodes?.length || 0} episodios</span>
                </div>
              </div>
            )}
            
            {/* Lista de Episodios */}
            {currentSeason?.episodes && currentSeason.episodes.length > 0 ? (
              <div className="space-y-4">
                {currentSeason.episodes.map((episode) => (
                  <div 
                    key={episode.id}
                    className="flex gap-4 p-4 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-[180px] h-[100px] flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                      {episode.still_path ? (
                        <OptimizedImage
                          src={getImageUrl(episode.still_path, 'w300')}
                          alt={episode.name}
                          width={180}
                          height={100}
                          quality={80}
                          useProxy={true}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                          Sem imagem
                        </div>
                      )}
                      {/* Play Overlay */}
                      <button
                        onClick={() => handleEpisodePlay(episode.episode_number, selectedSeason)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <div className="w-12 h-12 rounded-full backdrop-blur-md bg-white/20 border border-white/40 flex items-center justify-center hover:bg-white/30 transition-colors">
                          <Play size={20} fill="white" />
                        </div>
                      </button>
                    </div>
                    
                    {/* Info do Episodio */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-white font-semibold">
                          {episode.episode_number}. {episode.name}
                        </h3>
                        {episode.runtime && (
                          <span className="text-white/50 text-sm flex-shrink-0">{episode.runtime} min</span>
                        )}
                      </div>
                      <p className="text-white/60 text-sm line-clamp-2 mb-2">
                        {episode.overview || 'Sem descricao disponivel'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        {episode.air_date && (
                          <span>{new Date(episode.air_date).toLocaleDateString('pt-BR')}</span>
                        )}
                        {episode.vote_average > 0 && (
                          <span className="flex items-center gap-1">
                            <Star size={12} className="text-yellow-400" />
                            {episode.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 text-center">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/70">Carregando episodios da Temporada {selectedSeason}...</p>
              </div>
            )}
          </div>
        )}
        
        {/* Mensagem para series sem temporadas */}
        {mediaType === 'tv' && seasons.length === 0 && (
          <div className="p-8 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 text-center">
            <p className="text-white/70">Esta serie nao possui informacoes de temporadas disponiveis</p>
          </div>
        )}
      </div>
    </div>
  );
}
