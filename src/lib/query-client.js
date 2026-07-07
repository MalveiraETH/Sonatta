import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 2 * 60 * 1000, // 2 minutos — evita refetch redundante ao trocar de aba
			gcTime: 5 * 60 * 1000,    // mantém cache por 5 minutos após desmonte
		},
	},
});