
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { getGroundedAnswer, getMapsAnswer } from '../../services/geminiService';
import { Search, MapPin } from 'lucide-react';
import type { GenerateContentResponse } from '@google/genai';

const Discover: React.FC = () => {
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
    const [result, setResult] = useState<Record<string, GenerateContentResponse | null>>({});
    const [error, setError] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('What are the latest trends in wearable fitness technology in 2024?');
    const [mapsQuery, setMapsQuery] = useState('Find top-rated vegetarian restaurants near me');
    const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    const getLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                () => {
                    setError(prev => ({ ...prev, maps: 'Could not get your location. Please enable location services.' }));
                }
            );
        } else {
            setError(prev => ({ ...prev, maps: 'Geolocation is not supported by this browser.' }));
        }
    }, []);

    useEffect(() => {
        getLocation();
    }, [getLocation]);

    const handleAction = async (action: 'search' | 'maps') => {
        setIsLoading(prev => ({ ...prev, [action]: true }));
        setError(prev => ({ ...prev, [action]: '' }));
        setResult(prev => ({ ...prev, [action]: null }));

        try {
            let response;
            if (action === 'search') {
                response = await getGroundedAnswer(searchQuery);
            } else if (action === 'maps') {
                if (!location) {
                    throw new Error("Location not available. Please allow location access.");
                }
                response = await getMapsAnswer(mapsQuery, location);
            } else {
                throw new Error("Unknown action");
            }
            setResult(prev => ({ ...prev, [action]: response }));
        } catch (err: any) {
            setError(prev => ({ ...prev, [action]: err.message || 'An error occurred.' }));
        } finally {
            setIsLoading(prev => ({ ...prev, [action]: false }));
        }
    };
    
    const renderCitations = (response: GenerateContentResponse | null) => {
        const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (!chunks || chunks.length === 0) return null;

        return (
            <div className="mt-4">
                <h4 className="font-bold text-on-surface-variant">Sources:</h4>
                <ul className="list-disc list-inside text-sm">
                    {chunks.map((chunk, index) => {
                        const uri = chunk.web?.uri || chunk.maps?.uri;
                        const title = chunk.web?.title || chunk.maps?.title;
                        if (!uri) return null;
                        return (
                             <li key={index}>
                                <a href={uri} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    {title || uri}
                                </a>
                            </li>
                        )
                    })}
                </ul>
            </div>
        )
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-on-surface">Discover</h1>
            <p className="text-md text-on-surface-variant">Get up-to-date answers from Google Search and Maps.</p>

            {/* Search Grounding */}
            <Card>
                <div className="flex items-center mb-2">
                    <Search className="text-primary mr-2" />
                    <h2 className="text-xl font-bold">Fitness & News Search</h2>
                </div>
                <p className="text-on-surface-variant mb-4">Ask questions to get the latest information from the web.</p>
                <textarea
                    className="w-full bg-background p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-primary focus:outline-none"
                    rows={2}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button onClick={() => handleAction('search')} isLoading={isLoading['search']} className="mt-2 w-full">Search</Button>
                {isLoading.search && <div className="mt-4"><Spinner /></div>}
                {result.search && (
                    <div className="mt-4 p-2 bg-background rounded whitespace-pre-wrap">
                        <p>{result.search.text}</p>
                        {renderCitations(result.search)}
                    </div>
                )}
                {error.search && <p className="mt-2 text-red-500">{error.search}</p>}
            </Card>

            {/* Maps Grounding */}
            <Card>
                <div className="flex items-center mb-2">
                    <MapPin className="text-primary mr-2" />
                    <h2 className="text-xl font-bold">Find Healthy Options Nearby</h2>
                </div>
                <p className="text-on-surface-variant mb-4">Discover gyms, restaurants, and more near your location.</p>
                <textarea
                    className="w-full bg-background p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-primary focus:outline-none"
                    rows={2}
                    value={mapsQuery}
                    onChange={(e) => setMapsQuery(e.target.value)}
                />
                <Button onClick={() => handleAction('maps')} isLoading={isLoading['maps']} disabled={!location} className="mt-2 w-full">Find Nearby</Button>
                {!location && !error.maps && <p className="text-sm text-yellow-400 mt-2">Getting your location...</p>}
                {isLoading.maps && <div className="mt-4"><Spinner /></div>}
                {result.maps && (
                     <div className="mt-4 p-2 bg-background rounded whitespace-pre-wrap">
                        <p>{result.maps.text}</p>
                        {renderCitations(result.maps)}
                    </div>
                )}
                {error.maps && <p className="mt-2 text-red-500">{error.maps}</p>}
            </Card>

        </div>
    );
};

export default Discover;
