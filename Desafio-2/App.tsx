import 'react-native-gesture-handler';
import * as React from 'react';
import { NavigationContainer, DefaultTheme as NavLight } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Provider as PaperProvider,
  MD3LightTheme,
  Appbar,
  Text,
  TextInput,
  Card,
  Icon,
  ActivityIndicator,
  Button,
} from 'react-native-paper';
import { FlatList, SafeAreaView, StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { useState, useMemo } from 'react';

type ItunesSong = {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  releaseDate: string;
  primaryGenreName: string;
};

type GroupedResults = {
  [genre: string]: ItunesSong[];
};

type SectionData = {
  title: string;
  data: ItunesSong[];
};

type RootDrawerParamList = {
  BuscarMusicas: undefined;
  Sobre: undefined;
};

type RootStackParamList = {
  Home: undefined;
  DetalhesMusica: { song: ItunesSong };
  SearchMain: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    background: '#FAFAFA',
    surface: '#FFFFFF',
  },
};

const navTheme = {
  ...NavLight,
  colors: {
    ...NavLight.colors,
    background: '#FAFAFA',
    card: '#FFFFFF',
    text: '#1F2937',
    border: '#E5E7EB',
  },
};

function Header({ title, navigation }: any) {
  return (
    <Appbar.Header mode="center-aligned">
      <Appbar.Action icon="menu" onPress={() => navigation.openDrawer()} />
      <Appbar.Content title={title} />
    </Appbar.Header>
  );
}

function HomeScreen({ navigation }: any) {
  return (
    <ScreenContainer>
      <Card mode="elevated">
        <Card.Title title="Bem-vindo" left={(props) => <Icon source="music" size={24} />} />
        <Card.Content>
          <Text>Explore músicas usando a API do iTunes.</Text>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" onPress={() => navigation.navigate('BuscarMusicas')}>
            Buscar Músicas
          </Button>
        </Card.Actions>
      </Card>
    </ScreenContainer>
  );
}

function SearchScreen({ navigation }: any) {
  const [songs, setSongs] = useState<ItunesSong[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [message, setMessage] = useState<string>("Digite uma música ou artista");

  async function searchSongs(term: string) {
    if (!term) {
      setMessage("Digite um termo para buscar");
      return;
    }
    
    setLoading(true);
    setSongs([]);
    setMessage("Buscando...");

    const CORS_PROXY = 'https://corsproxy.io/?';
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song`;
    const url = `${CORS_PROXY}${encodeURIComponent(itunesUrl)}`;

    try {
      const res = await fetch(url);
      const data: { results?: ItunesSong[] } = await res.json();

      if (data && data.results) {
        setSongs(data.results as ItunesSong[]);
        if (data.results.length === 0) {
          setMessage("Nenhum resultado encontrado");
        } else {
          setMessage("");
        }
      } else {
        setMessage("Erro na resposta da API");
      }
    } catch (error) {
      setMessage("Erro na busca");
    } finally {
      setLoading(false);
    }
  }

  const groupedResults: GroupedResults = useMemo(() => {
    if (songs.length === 0) return {};
    return songs.reduce((acc, item) => {
      const genre = item.primaryGenreName || 'Outro';
      if (!acc[genre]) acc[genre] = [];
      acc[genre].push(item);
      return acc;
    }, {} as GroupedResults);
  }, [songs]);

  const sections: SectionData[] = useMemo(() => {
    return Object.keys(groupedResults).map(genre => ({
      title: genre,
      data: groupedResults[genre],
    }));
  }, [groupedResults]);
  
  const renderMusicCard = ({ item }: { item: ItunesSong }) => {
    const releaseYear = new Date(item.releaseDate).getFullYear();
    
    return (
      <TouchableOpacity 
        style={styles.musicCard}
        onPress={() => navigation.navigate('DetalhesMusica', { song: item })}
      >
        <Image 
          source={{ uri: item.artworkUrl100 }} 
          style={styles.albumImage}
        />
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.trackName}
        </Text>
        <Text style={styles.cardArtist} numberOfLines={1}>
          {item.artistName}
        </Text>
        <Text style={styles.cardYear}>
          Ano: {releaseYear}
        </Text>
      </TouchableOpacity>
    );
  };
  
  const renderGenreSection = ({ item }: { item: SectionData }) => (
    <View style={styles.genreContainer}>
      <Text style={styles.genreTitle}>{item.title}</Text>
      <View style={styles.resultsGrid}>
        {item.data.map(song => (
          <View key={song.trackId}>
            {renderMusicCard({ item: song })}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          placeholder="Buscar músicas..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={styles.input}
          onSubmitEditing={() => searchSongs(searchTerm)}
          mode="outlined"
        />
        <Button 
          mode="contained" 
          onPress={() => searchSongs(searchTerm)}
          loading={loading}
          style={styles.searchButton}
        >
          Buscar
        </Button>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>{message}</Text>
        </View>
      ) : message && songs.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{message}</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.title}
          renderItem={renderGenreSection}
        />
      )}
    </SafeAreaView>
  );
}

function DetalhesMusicaScreen({ route, navigation }: any) {
  const { song } = route.params;
  const releaseYear = new Date(song.releaseDate).getFullYear();

  return (
    <ScreenContainer>
      <Card mode="elevated">
        <Card.Cover source={{ uri: song.artworkUrl100 }} />
        <Card.Title 
          title={song.trackName}
          subtitle={song.artistName}
        />
        <Card.Content>
          <Text variant="bodyMedium">Gênero: {song.primaryGenreName}</Text>
          <Text variant="bodyMedium">Ano de Lançamento: {releaseYear}</Text>
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => navigation.goBack()}>Voltar</Button>
        </Card.Actions>
      </Card>
    </ScreenContainer>
  );
}

function StackSearch({ navigation }: any) {
  return (
    <>
      <Header title="Buscar Músicas" navigation={navigation} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SearchMain" component={SearchScreen} />
        <Stack.Screen name="DetalhesMusica" component={DetalhesMusicaScreen} />
      </Stack.Navigator>
    </>
  );
}

function SobreScreen({ navigation }: any) {
  return (
    <>
      <Header title="Sobre" navigation={navigation} />
      <ScreenContainer>
        <Card mode="elevated">
          <Card.Title 
            title="Sobre o App"
            left={() => <Icon source="information" size={24} />}
          />
          <Card.Content>
            <Text>Aplicativo que consome a API do iTunes para buscar músicas.</Text>
            <Text>Desenvolvido com React Native Paper e React Navigation.</Text>
          </Card.Content>
        </Card>
      </ScreenContainer>
    </>
  );
}

function ScreenContainer({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

function TabsScreen() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarStyle: { backgroundColor: '#FFFFFF' },
        tabBarIcon: ({ color, size }) => {
          const icon = route.name === 'Início' ? 'home' : 'music';
          return <Icon source={icon} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Início" component={HomeScreen} />
      <Tabs.Screen name="Buscar" component={StackSearch} />
    </Tabs.Navigator>
  );
}

export default function App() {
  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer theme={navTheme}>
        <Drawer.Navigator
          screenOptions={{
            headerShown: false,
            drawerActiveTintColor: '#2563EB',
            drawerStyle: { backgroundColor: '#FFFFFF' },
          }}
        >
          <Drawer.Screen
            name="BuscarMusicas"
            component={TabsScreen}
            options={{
              drawerIcon: ({ color, size }) => <Icon source="home" size={size} color={color} />,
              drawerLabel: "Início"
            }}
          />
          <Drawer.Screen
            name="Sobre"
            component={SobreScreen}
            options={{
              drawerIcon: ({ color, size }) => <Icon source="information" size={size} color={color} />,
            }}
          />
        </Drawer.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  container: { 
    flex: 1, 
    backgroundColor: "#FAFAFA" 
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    paddingHorizontal: 20
  },
  muted: { 
    color: "#666", 
    marginTop: 10, 
    fontSize: 16,
    textAlign: 'center'
  },
  searchBar: {
    flexDirection: 'row',
    margin: 16,
    gap: 8,
  },
  input: {
    flex: 1,
  },
  searchButton: {
    justifyContent: 'center',
  },
  genreContainer: { 
    marginVertical: 10, 
    marginHorizontal: 16 
  },
  genreTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#666", 
    marginBottom: 10 
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  musicCard: {
    backgroundColor: "#FFF",
    width: '47%',
    marginBottom: 16,
    padding: 10,
    borderRadius: 8,
    elevation: 3,
  },
  albumImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 6,
  },
  cardTitle: { 
    fontWeight: "bold", 
    fontSize: 14, 
    marginTop: 8,
    lineHeight: 18,
  },
  cardArtist: { 
    color: "#666", 
    fontSize: 12,
  },
  cardYear: { 
    color: "#666", 
    fontSize: 12,
  },
});