﻿namespace BitShuva.Chavah {
    export class NowPlayingController {
        
        songs: Song[] = [];
        trending: Song[] = [];
        recent: Song[] = [];
        popular: Song[] = [];
        likes: Song[] = [];
        isFetchingAlbums = false;
        currentSong: Song | null;
        recurringFetchHandle: number | null;

        static $inject = [
            "songApi",
            "songBatch",
            "audioPlayer",
            "albumCache",
            "appNav",
            "$q",
            "$scope"
        ];

        constructor(
            private songApi: SongApiService,
            private songBatch: SongBatchService,
            private audioPlayer: AudioPlayerService,
            private albumCache: AlbumCacheService,
            private appNav: AppNavService,
            private $q: ng.IQService,
            $scope: ng.IScope) {

            this.audioPlayer.song.subscribeOnNext(song => this.nextSongBeginning(song));
            this.audioPlayer.songCompleted.subscribe(song => this.songCompleted(song));
            this.songBatch.songsBatch.subscribeOnNext(() => this.songs = this.getSongs());
            
            // Recent plays we fetch once, at init. Afterwards, we update it ourselves.
            this.fetchRecentPlays();
            this.setupRecurringFetches();

            // Play the next song if we don't already have one playing.
            // We don't have one playing when first loading the UI.
            var hasCurrentSong = this.audioPlayer.song.getValue();
            if (!hasCurrentSong) {
                if (!this.playSongInUrlQuery()) {
                    this.songBatch.playNext();
                }
            }

            $scope.$on("$destroy", () => this.dispose());
        }

        get currentArtistDonateUrl(): string {
            var song = this.currentSong;
            if (song && song.artist) {
                return "#/donate/" + encodeURIComponent(song.artist);
            }

            return "#/donate";
        }

        dispose() {
            if (this.recurringFetchHandle) {
                clearTimeout(this.recurringFetchHandle);
            }
        }
        
        getSongs(): Song[] {
            var songs = [
                this.audioPlayer.song.getValue()!,
                this.songBatch.songsBatch.getValue()[0],
                this.songBatch.songsBatch.getValue()[1],
                this.songBatch.songsBatch.getValue()[2],
                this.songBatch.songsBatch.getValue()[3]
            ].filter(s => !!s && s.name);
            this.fetchAlbumColors(songs);

            return songs;
        }

        getSongOrPlaceholder(song: Song | null): Song {
            return song || Song.empty();
        }

        fetchAlbumColors(songs: Song[]) {
            var songsNeedingAlbumSwatch = songs
                .filter(s => !s.hasSetAlbumArtColors && s.id !== "songs/0");
            if (songsNeedingAlbumSwatch.length > 0) {
                this.isFetchingAlbums = true;
                this.albumCache.getAlbumsForSongs(songsNeedingAlbumSwatch)
                    .then(albums => this.populateSongsWithAlbumColors(albums));
            }
        }

        populateSongsWithAlbumColors(albums: Album[]) {
            albums.forEach(a => {
                var songsForAlbum = this.getAllSongsOnScreen().filter(s => s.albumArtUri === a.albumArtUri);
                songsForAlbum.forEach(s => s.updateAlbumArtColors(a));
            });
        }

        setupRecurringFetches() {
            var songFetchesTask = this.songApi.getTrendingSongs(3)
                .then(results => this.updateSongList(this.trending, results))
                .then(() => this.songApi.getPopularSongs(3))
                .then(results => this.updateSongList(this.popular, results))
                .then(() => this.songApi.getLikes(3))
                .then(results => this.updateSongList(this.likes, results))
                .finally(() => {
                    this.fetchAlbumColors(this.getAllSongsOnScreen());
                    
                    // Call ourselves every 30s.
                    this.recurringFetchHandle = setTimeout(() => this.setupRecurringFetches(), 30000);
                });
        }

        fetchRecentPlays() {
            this.songApi.getRecentPlays(3)
                .then(results => {
                    results.forEach(s => this.recent.push(s));
                    if (this.recent.length > 3) {
                        this.recent.length = 3;
                    }
                })
        }

        updateSongList(target: Song[], source: Song[]) {
            target.splice(0, target.length, ...source);
            this.fetchAlbumColors(this.getAllSongsOnScreen());
        }

        getAllSongsOnScreen(): Song[] {
            return this.songs.concat(this.recent, this.trending, this.likes, this.popular);
        }

        nextSongBeginning(song: Song | null) {
            this.songs = this.getSongs();

            if (song) {
                if (this.currentSong) {
                    this.recent.splice(0, 0, this.currentSong);
                    if (this.recent.length > 3) {
                        this.recent.length = 3;
                    }
                }

                this.currentSong = song;
            }
        }

        songCompleted(song: Song | null) {
            if (song) {
                this.songApi.songCompleted(song.id);
            }
        }

        songClicked(song: Song) {
            if (song !== this.currentSong) {
                song.reasonPlayed = SongPick.YouRequestedSong;
                var songBatch = this.songBatch.songsBatch.getValue();
                var songIndex = songBatch.indexOf(song);
                if (songIndex >= 0) {
                    songBatch.splice(songIndex, 1);
                    songBatch.splice(0, 0, song);
                    this.songBatch.playNext();
                }
            }
        }

        playSongFromCurrentArtist() {
            if (this.currentSong) {
                this.audioPlayer.playSongFromArtist(this.currentSong.artist);
            }
        }

        playSongFromCurrentAlbum() {
            if (this.currentSong) {
                this.audioPlayer.playSongFromAlbum(this.currentSong.album);
            }
        }

        playSongInUrlQuery(): boolean {
            // Does the user want us to play a certain song/album/artist?
            var songId = this.getUrlQueryOrNull("song");
            if (songId) {
                this.audioPlayer.playSongById(songId);
                return true;
            }

            var album = this.getUrlQueryOrNull("album");
            if (album) {
                this.audioPlayer.playSongFromAlbum(album);
                return true;
            }

            var artist = this.getUrlQueryOrNull("artist");
            if (artist) {
                this.audioPlayer.playSongFromArtist(artist);
                return true;
            }

            return false;
        }

        private getUrlQueryOrNull(term: string): string | null {
            var queryString = window.location.search;
            if (queryString) {
                var allTerms = queryString.split("&");
                var termWithEquals = term + "=";
                var termAtBeginning = "?" + termWithEquals;
                var match = allTerms.find(t => t.startsWith(termWithEquals) || t.startsWith(termAtBeginning));
                if (match) {
                    var termValue = match.substr(match.indexOf("=") + 1);
                    if (termValue) {
                        return termValue;
                    }
                }
            }

            return null;
        }
    }

    App.controller("NowPlayingController", NowPlayingController);
}