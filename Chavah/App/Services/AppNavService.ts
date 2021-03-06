﻿namespace BitShuva.Chavah {
    export class AppNavService {

        static $inject = [
            "audioPlayer",
            "templatePaths",
            "$location",
            "$uibModal"
        ];

        constructor(
            private audioPlayer: AudioPlayerService,
            private templatePaths: TemplatePaths,
            private $location: ng.ILocationService,
            private $uibModal: ng.ui.bootstrap.IModalService) {

            // Listen for when the song changes and update the document title.
            audioPlayer.song
                .subscribe(song => this.updateDocumentTitle(song));
        }

        signIn() {
            this.$location.url("/signin");
        }

        nowPlaying() {
            this.$location.url("/nowplaying");
        }

        promptSignIn() {
            this.$location.url("/promptsignin");
        }

        register(attemptedEmail?: string) {
            if (attemptedEmail) {
                this.$location.url(`/register/${encodeURIComponent(attemptedEmail)}`)
            } else {
                this.$location.url("/register");
            }
        }

        createPassword(email: string) {
            this.$location.url(`/createpassword/${encodeURIComponent(email)}`);
        }

        password(email: string) {
            this.$location.url(`/password/${encodeURIComponent(email)}`);
        }

        editAlbum(albumId: string) {
            this.$location.url(`/admin/${albumId}`);
        }

        showSongRequestDialog(): ng.ui.bootstrap.IModalServiceInstance {
            var requestSongDialog = this.$uibModal.open({
                controller: "RequestSongController as vm",
                templateUrl: this.templatePaths.songRequestModal,
                windowClass: "request-song-modal"
            });

            return requestSongDialog;
        }

        /**
         * Gets the client-side query parameters, returned as an object map.
         */
        getQueryParams(): any {
            return this.$location.search();
        }

        private updateDocumentTitle(song: Song | null) {
            // Update the document title so that the browser tab updates.
            if (song) {
                document.title = `${song.name} by ${song.artist} on Chavah Messianic Radio`;
            } else {
                document.title = "Chavah Messianic Radio";
            }
        }
    }

    App.service("appNav", AppNavService);
}