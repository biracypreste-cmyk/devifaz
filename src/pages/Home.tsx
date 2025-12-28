import { useEffect, useState } from 'react';
import { loadAllContent, groupContentByGenre, Content } from '../utils/primeVicioLoader';
import { MovieCard } from '../components/MovieCard';
import { Movie } from '../utils/tmdb';

interface HomeProps {
    onPlay: (item: Content) => void;
}

export function Home({ onPlay }: HomeProps) {
    const [contentByGenre, setContentByGenre] = useState<Record<string, Content[]> | null>(null);
    const [allContent, setAllContent] = useState<Content[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                console.log('🏠 Carregando conteúdo para Home...');
                
                // Fonte única de dados: loadAllContent()
                const { movies, series } = await loadAllContent();
                
                // Normalizar filmes + séries no mesmo formato (já estão no formato Content)
                const normalized: Content[] = [...movies, ...series];
                
                console.log(`✅ ${normalized.length} itens carregados (${movies.length} filmes + ${series.length} séries)`);
                
                // Agrupar TODO o conteúdo por gênero
                const grouped = groupContentByGenre(normalized);
                
                console.log(`📂 Agrupado em ${Object.keys(grouped).length} gêneros`);
                
                setAllContent(normalized);
                setContentByGenre(grouped);
                setLoading(false);
            } catch (error) {
                console.error('❌ Erro ao carregar conteúdo:', error);
                setContentByGenre({});
                setAllContent([]);
                setLoading(false);
            }
        };
        load();
    }, []);

    // Conversor de Content para Movie (interface do TMDB usada pelo MovieCard)
    const toMovie = (item: Content): Movie => ({
        id: item.id,
        title: item.title,
        name: item.name,
        overview: item.overview || '',
        poster_path: item.poster_path || '',
        backdrop_path: item.backdrop_path || '',
        vote_average: item.vote_average || 0,
        media_type: item.type === 'tv' ? 'tv' : 'movie',
        release_date: item.release_date,
        first_air_date: item.first_air_date,
        streamUrl: item.streamUrl
    });

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
            </div>
        );
    }

    // Pegar o primeiro item para o hero (pode ser filme ou série)
    const heroItem = allContent[0];

    // Ordenar gêneros por quantidade de conteúdo (mais populares primeiro)
    const sortedGenres = contentByGenre 
        ? Object.entries(contentByGenre)
            .sort((a, b) => b[1].length - a[1].length)
            .filter(([_, items]) => items.length > 0)
        : [];

    return (
        <div className="min-h-screen bg-redflix-gradient pb-20">
            {/* Hero Section */}
            {heroItem && (
                <div className="relative h-[80vh] w-full overflow-hidden">
                    <div className="absolute inset-0">
                        <img
                            src={heroItem.backdrop_path || heroItem.poster_path}
                            alt={heroItem.title}
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                    </div>

                    <div className="absolute bottom-[20%] left-12 max-w-2xl space-y-6">
                        <h1 className="text-6xl font-bold text-white drop-shadow-lg leading-tight">
                            {heroItem.title}
                        </h1>
                        <p className="text-lg text-gray-200 line-clamp-3 drop-shadow-md">
                            {heroItem.overview}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => onPlay(heroItem)}
                                className="flex items-center gap-2 rounded bg-white px-8 py-3 text-xl font-bold text-black hover:bg-gray-200 focus-ring transition-colors"
                            >
                                ▶ Assistir
                            </button>
                            <button className="flex items-center gap-2 rounded bg-gray-500/50 px-8 py-3 text-xl font-bold text-white backdrop-blur hover:bg-gray-500/70 focus-ring transition-colors">
                                ℹ Mais Informações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Grids - Seções por gênero (Brasil), misturando filmes e séries */}
            <div className="relative z-10 -mt-32 px-12 space-y-12">
                {sortedGenres.map(([genreName, items]) => (
                    <div key={genreName}>
                        <h2 className="text-2xl font-bold text-white mb-6">{genreName}</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-[24px]">
                            {items.slice(0, 14).map(item => (
                                <div key={`${genreName}-${item.id}`} className="relative z-10">
                                    <MovieCard
                                        movie={toMovie(item)}
                                        onClick={() => onPlay(item)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
