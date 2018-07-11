// Events of PlayerUser - the business object ;-) who click Player buttons, consumer of Player object
Core.registerRequestPoint('PlayerUser_PlayRq');
Core.registerRequestPoint('PlayerUser_StopRq');
Core.registerRequestPoint('PlayerUser_PauseRq');
Core.registerRequestPoint('PlayerUser_LoadRq');
Core.registerRequestPoint('PlayerUser_GetPositionRq');
Core.registerRequestPoint('PlayerUser_SetPositionRq');
Core.registerRequestPoint('PlayerUser_MuteRq');
Core.registerRequestPoint('PlayerUser_UnmuteRq');

// Events of Player - the business object with responsivility to manage <video> object
Core.registerEventPoint('Player_Started');
Core.registerEventPoint('Player_Paused');
Core.registerEventPoint('Player_Stopped');
Core.registerEventPoint('Player_Ended');
Core.registerEventPoint('Player_VideoLoaded');
Core.registerEventPoint('Player_Muted');
Core.registerEventPoint('Player_Unmuted');

// Events of PlayerUI - the business object with responsivility to manage how UI works
Core.registerEventPoint('PlayerUI_PlayingStateChanged');
Core.registerEventPoint('PlayerUI_PrevClicked');
Core.registerEventPoint('PlayerUI_NextClicked');

// Events of Playlist - the business object
Core.registerEventPoint('Playlist_Ready');

// Events of PlaylistUser - the business object ;-) who use playlist, consumer of Playlist
Core.registerRequestPoint('PlaylistUser_NextRq');
Core.registerRequestPoint('PlaylistUser_PrevRq');


Player = {
  videoNode: null,
  muted: false,
  unmuteVolume: null,
  initPlayer: function() {
    CatchEvent(DOM_Init);
    this.videoNode = document.getElementById('video-placeholder');
    this.videoNode.addEventListener('ended', function() {
      FireEvent(new Player_Ended());
    });
  },
  play: function() {
    CatchRequest(PlayerUser_PlayRq);
    this.videoNode.play();
    FireEvent(new Player_Started);
  },
  stop: function() {
    CatchRequest(PlayerUser_StopRq);
    this.videoNode.pause();
    this.videoNode.currentTime = 0;
    FireEvent(new Player_Stopped)
  },
  pause: function() {
    CatchRequest(PlayerUser_PauseRq);
    this.videoNode.pause();
    FireEvent(new Player_Paused)
  },
  load: function() {
    var request = CatchRequest(PlayerUser_LoadRq);
    var _this = this;
    return function(success) {
      _this.videoNode.pause();
      _this.videoNode.src = request.src;
      (function waitLoad(){
        if (_this.videoNode.duration) {
          FireEvent(new Player_VideoLoaded({
            src: _this.videoNode.src, 
            duration: _this.videoNode.duration
          }));
          success();
        } else {
          setTimeout(waitLoad, 50);
        }
      })();
    }
  },
  getPosition: function() {
    var request = CatchRequest(PlayerUser_GetPositionRq);
    var _this = this;
    return function(success) {
      success({pos: _this.videoNode.currentTime, duration: _this.videoNode.duration})
    }
  },
  setPosition: function() {
    var request = CatchRequest(PlayerUser_SetPositionRq);
    var _this = this;
    return function(success) {
      _this.videoNode.currentTime = request.pos;
      success()
    }
  },
  mute: function() {
    var request = CatchRequest(PlayerUser_MuteRq);
    if(!this.muted) {
      this.unmuteVolume = this.videoNode.volume;
      this.videoNode.volume = 0;
      this.muted = 1;
      FireEvent(Player_Muted)
    }
  },
  unmute: function() {
    var request = CatchRequest(PlayerUser_UnmuteRq);
    if(this.muted) {
      this.videoNode.volume = this.unmuteVolume;
      this.muted = 0;
      FireEvent(Player_Unmuted)
    }
  }
};

PlayerUI = {
  playState: 0,
  setPlayStatePlaying: function() {
    CatchEvent(PlayerUser_PlayRq);
    if(!this.playState) {
      this.playState = 1;
      FireEvent(new PlayerUI_PlayingStateChanged);
    }
  },
  setPlayStateNotPlaying: function() {
    CatchEvent( Player_Paused, Player_Stopped, Player_Ended);
    if(this.playState) {
      this.playState = 0;
      FireEvent(new PlayerUI_PlayingStateChanged);
    }
  },
  clickPlayPause: function() {
    if(!this.playState) {
      FireRequest(new PlayerUser_PlayRq)
    } else {
      FireRequest(new PlayerUser_PauseRq)
    }
  },
  clickPrev: function() {
    FireRequest(new PlayerUser_GetPositionRq(), function(result) {
      console.log(result.pos);
      if(result.pos > 2) {
        FireRequest(new PlayerUser_SetPositionRq({pos: 0}));
      } else {
        FireRequest(new PlaylistUser_PrevRq);
      }
    });
  },
  clickNext: function() {
    FireRequest(new PlaylistUser_NextRq);
  },
  clickStop: function() {
    FireRequest(new PlayerUser_StopRq);
  },
  drawPlayPauseState: function() {
    CatchEvent(PlayerUI_PlayingStateChanged);
    document.querySelector('.playerui-playpause').innerHTML = this.playState ? '||' : 'play';
  },
  drawPlayPosition: function() {
    CatchEvent(PlayerUI_PlayingStateChanged, Player_Stopped, PlayerUser_SetPositionRq_Success);
    var _this = this;

    var positionElement = document.querySelector('.position');
    var durationTextElement = document.querySelector('.playerui-duration');
    var positionTextElement = document.querySelector('.playerui-position');

    (function draw() {
      window.requestAnimationFrame(function() {
        FireRequest(new PlayerUser_GetPositionRq, function(result) {
          positionElement.style.width = (result.pos || 0) / (result.duration || 1) * 100 + '%';
          durationTextElement.innerHTML = parseInt(result.duration || 0) + ' sec';
          positionTextElement.innerHTML = parseInt(result.pos || 0) + ' sec';

          if(_this.playState) {
            draw();
          }
        })
      })
    })();
  },
  setPlayPosition: function(clickEvent, containerElement) {
    FireRequest(new PlayerUser_GetPositionRq(), function(result) {
      FireRequest(new PlayerUser_SetPositionRq({
        pos: clickEvent.offsetX / containerElement.clientWidth * result.duration
      }))
    });
  },
  muted: false,
  drawMuted: function() {
    var event = CatchEvent(Player_Muted, Player_Unmuted);
    this.muted = event instanceof Player_Muted ? 1 : 0 ;
    document.querySelector('.playerui-mute').innerHTML = this.muted ? 'unmute' : 'mute';
  },
  clickMuteUnmute: function() {
    if(this.muted) {
      FireRequest(PlayerUser_UnmuteRq)
    } else {
      FireRequest(PlayerUser_MuteRq)
    }
  },
  clickPlus1: function() {
    FireRequest(new PlayerUser_GetPositionRq(), function(result) {
      FireRequest(new PlayerUser_SetPositionRq({pos: result.pos + 1}));
    });
  },
  clickMinus1: function() {
    FireRequest(new PlayerUser_GetPositionRq(), function(result) {
      FireRequest(new PlayerUser_SetPositionRq({pos: result.pos - 1}));
    });
  }
};

Playlist = {
  currentPlaying: -1,
  playlistItems: [],
  load: function() {
    CatchEvent(DOM_Init);
    this.playlistItems = [].map.call(document.querySelectorAll('.playlist-item'), function(it) {
      return it.getAttribute('href');
    });
    FireEvent(new Playlist_Ready)
  },
  changeCurrentPlaying: function() {
    var event = CatchEvent(Player_VideoLoaded);
    this.currentPlaying = this.playlistItems.indexOf(event.src);
  },
  playFirstOnInit: function() {
    CatchEvent(Playlist_Ready);
    FireRequest(new PlayerUser_LoadRq({src: this.playlistItems[0]}))
  },
  playPrev: function() {
    CatchEvent(PlaylistUser_PrevRq);
    if(this.currentPlaying > -1) {
      FireRequest(new PlayerUser_LoadRq({
        src: this.playlistItems[ 
          (this.currentPlaying - 1  + this.playlistItems.length) 
          % this.playlistItems.length 
        ]}),
                  function() {
        FireRequest(new PlayerUser_PlayRq);
      }
                 )
    }
  },
  playNext: function() {
    CatchEvent(Player_Ended, PlaylistUser_NextRq);
    if(this.currentPlaying > -1) {
      FireRequest(new PlayerUser_LoadRq({
        src: this.playlistItems[ 
          (this.currentPlaying + 1) 
             % this.playlistItems.length 
        ]}), 
        function() {
          FireRequest(new PlayerUser_PlayRq);
        }
      )
    }
  },
  clickVideo: function(src) {
    FireRequest(new PlayerUser_LoadRq({src: src}), function() {
      FireRequest(new PlayerUser_PlayRq);
    });
  },
  highlightCurrentVideo: function() {
    var event = CatchEvent(PlayerUser_LoadRq_Start, Player_VideoLoaded);
    [].map.call(
      document.querySelectorAll('.playlist-item'), 
      function(it) { 
        it.className = it.className.replace(/ active/, '')
      }
    )
    document.querySelector('[href="' + (event.src || event.request.src) + '"]')
      .className  += ' active';
  }
};

Core.processGlobal();
