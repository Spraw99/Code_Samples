import BaseModule from "BaseModule";
import $ from "jquery";
import globals from "globals";
import _ from "underscore";
import apiService from "apiService";
import PubSub from "pubsub";
import gsap from "TweenMax";
import LogEvent from "LogEvent"; // Player Error testing

var self;
var _debug = false; // Set to false to hide console logs
var currLanguage;

//  Assets
var assetPath = "/creativeData/burberry/assets/";
var posterBG = assetPath + "mobile_portrait_poster.jpg";
var logoMonogram = assetPath + "burberry_monogram_white.svg";

//  Animations
var _delay,
    _speed;

var startVideoTimer = 3; // 3 seconds

var _mobileCanvasLocation = '90';

var hasPlayed = false;
var _logoReady = false; // Runs once TB logo is in final position
var _room1Highlighted = true; // Determines if top video is larger

module.exports = class BoilerplateModule extends BaseModule {

    constructor(args) {
        super(args);
        self = this;

        self.loadStyleHead(window.wirewax.moduleUrl + 'style/33226.css');

        // Load fonts
        // this.toolkit.loadFont('creativeData/fonts/Gotham-Bold/', 'Gotham-Bold', 'Gotham-Bold');

        // Preload assets
        this.toolkit.preloadImage(posterBG);
        this.toolkit.preloadImage(logoMonogram);

        //  Clear WWX objects
        $('#play-button').remove();
        $('#pause-button').remove();
        $('#bottom-bar-fullscreen-button').remove();

        //  Assign widgetOverlay and tagOverlay
        self.widgetOverlay = $('#widget-overlay');
        self.tagOverlay = $('#tag-overlay');


        // Get data
        self.getModuleData();

        PubSub.subscribe(globals.HAS_SEEKED, function () {
            self.logTracer('HAS_SEEKED');
            self.updateCanvas();
        });

        self.canvasVisible = false;

    }


    //////////////////  OVERLAY MODULES  ///////////////
    buildOverlays() {
      self.logTracer("buildOverlays");

      // var exampleBG = assetPath + "mobile_endframe_example.jpg";

      //  Create logo monogram
      self.logoMonogram = $(`<div class="logo-monogram remove-button-events invisible">
                                    <div class="logo-bg"></div>
                                    <img class="logo" src="${logoMonogram}" />
                                 </div>`);

      //  Add logo monogram
      $('#control-overlay').append(self.logoMonogram);


      //  Create pause message
      self.pauseMessage = $(`<div id="pause_text" class="invisible">${self.playText}</div>`);


      //  Create endframe
      self.endFrame = $(`<div class="endframe-holder invisible">
                                    <div id="button_holder">
                                        <div id="replay_button" class="endframe-button">${self.replayText}</div>
                                        <div id="endframe_cta" class="endframe-button">${self.ctaText}</div>
                                    </div>
                                 </div>`);

      //  Create instructions frame
      self.instructionHolder = $(`<div class="instructions-holder invisible">
                                    <div id="text_holder">
                                        <div id="header_text">${self.instructHeaderMobile}</div>
                                        <div id="sub_text">${self.instructSubHeader}</div>
                                    </div>
                                    <div class="hitbox_button"></div>
                                 </div>`);

       //  Create poster frame
       self.posterHolder = $(`<div class="poster-holder">
                                     <img class="poster-image" src="${posterBG}" />
                                     <div id="intro_text">${self.introText}</div>
                                     <div class="hitbox_button"></div>
                                  </div>`);


      //  Add modules to widget-overlay
      self.widgetOverlay.append(self.pauseMessage, self.endFrame, self.instructionHolder, self.posterHolder);

      //  Set intro button
      self.introButton = self.widgetOverlay.find('.poster-holder .hitbox_button');

      self.introButton.unbind();
      self.introButton.on('click', function(){

          //  Set up audio
          hasPlayed = true;
          self.setupAudio();

          self.instructionScreen();

          self.logTracer('clicked - intro button');
          //  Add metrics
          self.recordUiMetric(
            JSON.stringify({
                eventName: 'Main Poster Frame Clicked',
                type: 'overlay',
                date: new Date(),
                currentFrame: self.player.getFrame(),
                open: false,
                close: true
            }),
            self.appRef,
            globals.WIDGET_METRIC_TYPES.MEDIA_CLOSE
          );


          //  Fade out poster
          gsap.to(self.posterHolder, 0.3, {autoAlpha:0, ease:Expo.easeOut, onComplete:function(){
                self.posterHolder.remove(); // Remove poster frame
          }});

      });

      // Build canvas content
      self.canvasSwitcher();

    }

    instructionScreen() {
        self.logTracer('instructionScreen');

        self.turnOnWidgets();

        //  Make sure instrctions are visible
        gsap.set([self.instructionHolder], {autoAlpha:1});
        self.instructionHolder.removeClass('invisible');

        //  Start delayed timer to start video
        gsap.delayedCall(startVideoTimer, self.startVideo);

        //  Set instructions button
        self.instrctionsButton = self.widgetOverlay.find('.instructions-holder .hitbox_button');

        self.instrctionsButton.unbind();
        self.instrctionsButton.on('click', function(){

            self.logTracer('clicked - instructions button');
            //  Add metrics
            self.recordUiMetric(
              JSON.stringify({
                  eventName: 'Insructions Frame Clicked',
                  type: 'overlay',
                  date: new Date(),
                  currentFrame: self.player.getFrame(),
                  open: false,
                  close: true
              }),
              self.appRef,
              globals.WIDGET_METRIC_TYPES.MEDIA_CLOSE
            );


            //  Kill delay to start video
            gsap.killDelayedCallsTo(self.startVideo);

            //  Force start video
            self.startVideo();
        });

    }

    startVideo() {
      self.logTracer('startVideo');

      // Resets room1 being larger
      _room1Highlighted = true;

      _speed = 0.75;

      gsap.to([self.instructionHolder], _speed, {autoAlpha:0, ease:Expo.easeOut, onComplete:function(){
            self.instructionHolder.addClass('invisible'); // Add back the invisible class
            self.shutOffWidgets(); // Removes widget clicks
      }});

      // self.shutOffWidgets(); // Removes widget clicks
      $('#control-overlay').removeClass('invisible'); // Helps set half-screen

      //  Start video
      self.player.play();


      //  Setup logo monogram button
      self.logoMonogram.removeClass('invisible');
      gsap.set([self.logoMonogram, self.logoMonogram.find('.logo'), self.logoMonogram.find('.logo-bg')], {left:'50%', top:'50%', xPercent:-50, yPercent:-50, transformOrigin:'50% 50%'});

      //  Setup canvas split to start
      gsap.set(self.canvasDivCover, {top:'50%'});
      gsap.set(self.canvasDivHolder, {bottom:'50%'});

      //  Show endframe when video is complete
      PubSub.subscribe(globals.VIDEO_END, function () {
          self.showEndframe();
      });

      //  Animate logo/canvas at video start
      self.setupSwitcher();

    }

    setupSwitcher() {
      self.logTracer('setupSwitcher');

      // Room1 is larger
      _room1Highlighted = true;

      _delay = 1.5;
      _speed = 1;

      //  Canvas move
      gsap.delayedCall(_delay, self.minimizeCanvas, [_speed]);

      //  Logo move
      gsap.to(self.logoMonogram, _speed, {top:_mobileCanvasLocation+'%', ease:Expo.easeInOut, delay:_delay, onComplete:function(){
                // self.logoMonogram.removeClass('remove-button-events'); // Allows button to be clickable
                // self.enableVideoButtons();
      }});

      gsap.delayedCall(_delay + _speed, function(){
            self.enableVideoButtons();
      });

    }

    ////////////////////  VIDEO CONTROLS  ////////////////////
    enableVideoButtons() {
      self.logTracer('enableVideoButtons');

      self.logoMonogram.removeClass('remove-button-events'); // Allows button to be clickable

      //  Reset _logoReady listener
      _logoReady = false;

      //  Show/Hide pause message
      PubSub.subscribe(globals.HAS_PAUSED, function () {
          self.pauseMessage.removeClass('invisible');
          self.videoPaused();
      });

      PubSub.subscribe(globals.HAS_PLAYED, function () {
          self.pauseMessage.addClass('invisible');
          if(_logoReady) self.videoPlaying(); // Waits for being paused the first time
      });

      //////////////////  LOGO BUTTON   ///////////////////
      self.logoMonogram.unbind();
      self.logoMonogram.on('touchstart mousedown',function(e) {
          e.stopPropagation();

          self.logTracer('press - logoMonogram button');
          //  Add metrics
          self.recordUiMetric(
            JSON.stringify({
                eventName: 'Logo Button Press',
                type: 'button',
                date: new Date(),
                currentFrame: self.player.getFrame(),
                open: false,
                close: false
            }),
            self.appRef,
            globals.WIDGET_METRIC_TYPES.MEDIA_PLAY
          );


          if(hasPlayed){
              self.toggleCanvas(true);
          }else{
              self.player.play();
          }

      });

      self.logoMonogram.on('touchend mouseup',function(e) {
          e.stopPropagation();

          self.logTracer('released - logoMonogram button');
          //  Add metrics
          self.recordUiMetric(
            JSON.stringify({
                eventName: 'Logo Button Release',
                type: 'button',
                date: new Date(),
                currentFrame: self.player.getFrame(),
                open: false,
                close: false
            }),
            self.appRef,
            globals.WIDGET_METRIC_TYPES.MEDIA_PLAY
          );


          if(hasPlayed){
              self.toggleCanvas(false);
          }else{
              self.player.play();
          }

      });

    }; // enableVideoButtons()

    videoPaused() {
      self.logTracer('videoPaused');

      //  Sets videoPlaying() to be launchable
      _logoReady = true;

      _speed = 0.4;
      var _offsetY = '110%';

      gsap.to([self.logoMonogram], _speed, {top:_offsetY, ease:Expo.easeInOut});
      gsap.to(self.canvasDivCover, _speed, {top:_offsetY, ease:Expo.easeInOut});
      gsap.to(self.canvasDivHolder, _speed, {bottom:_offsetY, ease:Expo.easeInOut});
    }

    videoPlaying() {
      self.logTracer('videoPlaying');

      _speed = 0.4;

      gsap.to(self.logoMonogram, _speed, {top:_mobileCanvasLocation+'%', ease:Expo.easeInOut});
      gsap.to(self.canvasDivCover, _speed, {top:_mobileCanvasLocation+'%', ease:Expo.easeInOut});
      gsap.to(self.canvasDivHolder, _speed, {bottom:_mobileCanvasLocation+'%', ease:Expo.easeInOut});
    }


    //////////////////  CANVAS REVEAL SETTINGS  ///////////////
    showFullCanvas() {
      self.logTracer('showFullCanvas');

      //  Room 2 highlighted
      _room1Highlighted = false;

      _speed = 0.4;

      gsap.to(self.canvasDivCover, _speed, {top:'0', ease:Expo.easeInOut});
      gsap.to(self.canvasDivHolder, _speed, {bottom:'0', ease:Expo.easeInOut});
    }

    minimizeCanvas(_speed) {
      self.logTracer('minimizeCanvas');

      //  Room 1 highlighted
      _room1Highlighted = true;

      if(!_speed) _speed = 0.4;

      // gsap.to(self.canvasDivCover, _speed, {clip:'rect(228em,150em,260em,0em)', ease:Expo.easeInOut});
      gsap.to(self.canvasDivCover, _speed, {top:_mobileCanvasLocation+'%', ease:Expo.easeInOut});
      gsap.to(self.canvasDivHolder, _speed, {bottom:_mobileCanvasLocation+'%', ease:Expo.easeInOut});
    }


    showEndframe() {
      self.logTracer('showEndframe');

      //  Add metrics
      self.recordUiMetric(
        JSON.stringify({
            eventName: 'Endframe Shown',
            type: 'overlay',
            date: new Date(),
            currentFrame: self.player.getFrame(),
            open: true,
            close: false
        }),
        self.appRef,
        globals.WIDGET_METRIC_TYPES.MEDIA_EXPAND
      );

      self.turnOnWidgets();

      self.endFrame.removeClass('invisible');

      _delay = 0;
      _speed = 0.3;

      gsap.fromTo(self.endFrame, _speed, {autoAlpha:0}, {autoAlpha:1, ease:Expo.easeOut, delay:_delay});

      self.replayButton = self.endFrame.find('#replay_button');
      self.endframeCTA = self.endFrame.find('#endframe_cta');

      //  Set endframe button controls
      self.replayButton.unbind();
      self.replayButton.on('click', function(e){
          e.stopPropagation();

          self.logTracer('clicked - replay button');
          //  Add metrics
          self.recordUiMetric(
            JSON.stringify({
                eventName: 'Endframe Replay Button',
                type: 'button',
                date: new Date(),
                currentFrame: self.player.getFrame(),
                open: false,
                close: false
            }),
            self.appRef,
            globals.WIDGET_METRIC_TYPES.MEDIA_PLAY
          );


          self.restartVideo();
      });

      //  Setup endframeCTA
      self.endframeCTA.unbind();
      self.endframeCTA.on('click', function(e){
          //  Track endframe CTA click
          self.doClickout(self.endframeCTAURL, "Endframe CTA Button Click", true);
      });

    }

    restartVideo() {
      self.logTracer('restartVideo');

      _delay = 0;
      _speed = 0.3;

      gsap.to(self.endFrame, _speed, {autoAlpha:0, ease:Expo.easeOut, onComplete:function(){
          self.endFrame.addClass('invisible');
      }});

      //  Start video
      self.startVideo();
    }



    //////////////////  WIDGET SETTINGS  ///////////////
    shutOffWidgets() {
      self.logTracer('shutOffWidgets');
      self.widgetOverlay.addClass('make-widget-clickable'); // Removes widget clicks
      $('#control-overlay').removeClass('invisible');
    }

    turnOnWidgets() {
      self.logTracer('turnOnWidgets');
      self.widgetOverlay.removeClass('make-widget-clickable'); // Adds widget clicks
      $('#control-overlay').addClass('invisible');
    }


    //////////////////  ERROR MESSAGE  ///////////////
    showErrorMessage() {
      self.logTracer('showErrorMessage');

      //  Hide built-in error message div
      $('#user-message').addClass('invisible');

      //  Create instructions frame
      self.errorMessageDiv = $(`<div class="error-holder">
                                    <div id="text_holder">
                                        <div id="header_text">${self.errorMessageText}</div>
                                    </div>
                                 </div>`);

       //  Add error message
       self.widgetOverlay.empty();
       self.widgetOverlay.append(self.errorMessageDiv);
    }

    //////////////////  SWITCH UTILITIES  ///////////////
    canvasSwitcher() {
        self.logTracer('canvasSwitcher');

        self.overlay = $(`<div class="canvas-cover">
                              <div id="simple-slider-module">
                                  <canvas id="simple-slider-module-canvas" class="unselectable"></canvas>
                              </div>
                          </div>`);


        $('#control-overlay').append(self.overlay);

        self.ctx = self.overlay.find('#simple-slider-module-canvas')[0].getContext('2d');
        self.canvasOpacity = 1;

        //  Get Canvas DIV
        self.canvasDivCover = $('#control-overlay .canvas-cover');
        self.canvasDivHolder = $('#control-overlay #simple-slider-module');
        // self.canvasDiv = $('#control-overlay #simple-slider-module-canvas')[0];

        self.player.onLoopUpdate = function () {
            if(!self.isResizing){
                self.updateCanvas();
            }
        };

        $(window).resize(function() {
            self.resizeFunction();
        });

        PubSub.subscribe(globals.WIDGET_CLOSED, function () {
            self.hasBodyEvents = false;
        });

    }

    toggleCanvas(state){

        if(state){
            self.canvasVisible = true;
            self.showFullCanvas(); // Animate canvas
            self.panToRight();
        }else{
            self.canvasVisible = true;
            self.minimizeCanvas(); // Animate canvas
            self.panToLeft();
        }
    }

    resizeFunction(resizeTo){
        self.isResizing = true;
        window.setTimeout(function () {

            if(globals.IS_IPHONE){
                if($('#wireWaxVideo')[0].paused){
                    self.updateCanvas();
                }
            }else{
                if (self.player.paused) {
                    self.updateCanvas();
                }
            }
            self.updateCanvas();
            self.isResizing = false;
        }, 50);
    }

    updateCanvas = _.throttle(function () {
        var canvas = $('#control-overlay #simple-slider-module-canvas')[0];
        var mainVideo = $('#wireWaxVideo')[0];
        canvas.width = mainVideo.videoWidth;
        canvas.height = mainVideo.videoHeight / 2;
        self.barPosition = 0;
        var separator = ((self.barPosition * mainVideo.videoWidth) / 100);

        var sourceX = separator;
        var sourceY = mainVideo.videoHeight / 2;
        var sourceWidth = mainVideo.videoWidth;
        var sourceHeight = mainVideo.videoHeight / 2;
        var destX = separator;
        var destY = 0;
        var destWidth = mainVideo.videoWidth;
        var destHeight = mainVideo.videoHeight / 2;

        if (globals.IS_IPHONE || globals.IS_SAFARI) {
            //Bug Safari: You have to check that the source width and source height are always smaller or equal to the image's width and height. And sourceX + sourceWidth can't be higher than the source actual width.
            self.ctx.drawImage(mainVideo, sourceX, sourceY, sourceWidth - sourceX, sourceHeight, destX, destY, destWidth - sourceX, destHeight);
        } else {
            self.ctx.drawImage(mainVideo, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);
        }

    }, 1000 / 25);



    //////////////////  AUDIO UTILITIES  ///////////////
    setupAudio(){
        self.logTracer('setupAudio');

        var vid = document.getElementById('wireWaxVideo');
        if(globals.IS_CHROME && !globals.IS_DESKTOP){
            //Chrome mobile
            vid.crossOrigin = "anonymous";
            var sources = vid.getElementsByTagName('source');
            for (var index = 0; index < sources.length; index++) {
                var newSource = sources[index].src;
                sources[index].src = newSource;
            }
            vid.load();
            vid.play();
        }

        //Init AudioContext
        var AudioContext = window.AudioContext || window.webkitAudioContext; //fallback for older chrome browsers
        var context = new AudioContext();
        context.createGain = context.createGain || context.createGainNode; //fallback for gain naming
        self.gainL = context.createGain();
        self.gainR = context.createGain();

        var splitter = context.createChannelSplitter(2);

        //Connect to source
        var source = context.createMediaElementSource(vid);
        source.crossOrigin = "anonymous";
        //Connect the source to the splitter
        source.connect(splitter, 0, 0);
        //Connect splitter' outputs to each Gain Nodes
        splitter.connect(self.gainL, 0);
        splitter.connect(self.gainR, 1);

        //Connect Left and Right Nodes to the output
        //Assuming Left as initial status
        self.gainL.connect(context.destination, 0);
        self.gainR.connect(context.destination, 0);
        //console.log(self.gainL,self.gainR);
        self.panToLeft();

        //  Needed for Safari
        self.volumeControl();
    }

    panToRight(){
        self.gainL.gain.value = 0;
        self.gainR.gain.value = globals.VOLUME; // For Safari
        // self.gainR.gain.value = 1;
    }

    panToLeft(){
        // self.gainL.gain.value = 1;
        self.gainL.gain.value = globals.VOLUME; // For Safari
        self.gainR.gain.value = 0;
    }

    //  Note used currently
    panToStereo(){
        self.gainL.gain.value = 1;
        self.gainR.gain.value = 1;
    }

    volumeControl() {
      //  Safari volume listener
      PubSub.subscribe(globals.VOLUME_CHANGE, function(){
        // console.log('changeVolume: ',globals.VOLUME);

        if(_room1Highlighted) {
          self.panToLeft();
        } else {
          self.panToRight();
        }

      });

    }


    //////////////////  SPREADSHEET  //////////////////
    getModuleData = function() {
      var spreadsheet = '';

      spreadsheet = 'spreadsheet_link';

      apiService.getSheetDataCdn(spreadsheet, function (sheetData) {

          self.sheetData = sheetData;

          //  Set language
          self.setLanguage();

          //  Build posterFrame
          self.buildOverlays();


          //////////  ERROR HANDLING  /////////
          self.isUnsupportedLang = self.checkQueryVariable('errorTest');
          // self.isUnsupportedLang ? self.showErrorMessage() : null;
          self.logTracer('is unsupported '+self.isUnsupportedLang);

          //////////  ERROR HANDLING  /////////
          self.isUnsupportedLang = self.checkQueryVariable('errorTest');
          // self.isUnsupportedLang ? self.showErrorMessage() : null;
          self.logTracer('is unsupported '+self.isUnsupportedLang);

          //override error text
          globals.ERRORS['5004'].displayMessage = self.errorMessageText;
          globals.ERRORS['5004'].type = 1;

          //  Add language specific error messages
          $('#control-overlay').find('.message-text').html(self.errorMessageText);

          //  Test Error message handling
          // PubSub.publish(globals.ERROR, new LogEvent(globals.ERROR, globals.ERRORS['5004']));

          //  If Error - then showErrorMessage
          PubSub.subscribe(globals.ERROR, self.showErrorMessage);

          //  If error testing
          self.isUnsupportedLang ? self.showErrorMessage() : null;

          //  If any version of IE = then show error message - audio switching isn't supported
          if(globals.IS_IE || globals.IS_IE_11) self.showErrorMessage();

          //  If error (show message) / If non (build video)
          // self.isUnsupportedLang ? self.showErrorMessage() : self.buildOverlays();

      }, function () {
          // do nothing
      });
    }


    //////////////////  LANGUAGES  //////////////////
    setLanguage() {
      self.logTracer('setLanguage');

      //  Sets Language
      if(!self.language) self.language = self.getLanguage(window.wirewax.lang);


      //  Setup content
      self.langLabel = 'label'+self.language; // Sets language label everywhere

      //  Set content
      self.introText = String(_.where(self.sheetData, {customnameref: 'intro_text'})[0][self.langLabel]).toUpperCase();
      self.playText = String(_.where(self.sheetData, {customnameref: 'play_text'})[0][self.langLabel]).toUpperCase();
      self.instructHeaderMobile = String(_.where(self.sheetData, {customnameref: 'instructions_header_mobile'})[0][self.langLabel]).toUpperCase();
      self.instructSubHeader = String(_.where(self.sheetData, {customnameref: 'instruction_subheader'})[0][self.langLabel]).toUpperCase();
      self.replayText = String(_.where(self.sheetData, {customnameref: 'replay_text'})[0][self.langLabel]).toUpperCase();
      self.ctaText = String(_.where(self.sheetData, {customnameref: 'cta_text'})[0][self.langLabel]).toUpperCase();
      self.errorMessageText = String(_.where(self.sheetData, {customnameref: 'error_message'})[0][self.langLabel]).toUpperCase();
      self.endframeCTAURL = _.where(self.sheetData, {customnameref: 'cta_url'})[0][self.langLabel];
    }

    getLanguage(_lang) {
      if(!_lang) _lang = 'en'; // Backup if string is missing
      var langCheck = _lang.toLowerCase();

      // var currLanguage;

      switch (langCheck) {
        case 'en':
          //  English
          currLanguage = 'en';
          break;
        case 'fr':
          //  French
          currLanguage = 'fr';
          break;
        case 'de':
          //  German
          currLanguage = 'de';
          break;
        case 'it':
          //  Italian
          currLanguage = 'it';
          break;
        case 'ja':
          //  Japanese
          currLanguage = 'ja';
          break;
        case 'zh':
          //  Chinese Simplified
          currLanguage = 'zh';
          break;
        case 'zf':
          //  Chinese Traditional
          currLanguage = 'zf';
          break;
        case 'ko':
          //  Korean
          currLanguage = 'ko';
          break;
        case 'es':
          //  Spanish
          currLanguage = 'es';
          break;
        case 'ru':
          //  Russian
          currLanguage = 'ru';
          break;
        case 'br':
          //  Portuguese
          currLanguage = 'br';
          break;
        default:
          //  English
          currLanguage = 'en';
          break;
      }

      self.logTracer('currLanguage '+currLanguage);
      return currLanguage;
    }


    //////////////////  UTILITIES  //////////////////
    checkQueryVariable(variable) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            self.logTracer('query varible: '+variable+ ' pair: '+pair);
            if (decodeURIComponent(pair[0]) == variable) {
                if(decodeURIComponent((pair[1]))== 'true'){
                    self.logTracer('matched true!');
                    return true;
                }else{
                    return false;
                }
            }
        }
        self.logTracer('Query variable %s not found '+ variable);
    }

    logTracer(_str) {
        //  Use this to toggle all console logs on/off
        if(_debug) console.log(_str);
    }

};
