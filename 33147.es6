import BaseModule from "BaseModule";
import $ from "jquery";
import globals from "globals";
import _ from "underscore";
import apiService from "apiService";
import PubSub from "pubsub";
import TweenMax from "TweenMax";
import requireShim from "require-shim";


let self;

var _debug = false; // Set to false to hide console logs
var gsap = TweenMax;

var _choiceVid = 8103747, // Choice vidId
    _vipVid = 8103744, // VIP vidId
    _introVid = 8108045; // intro vidId

var _brightcoveChoiceVidId = 5840378312001, // Choice vidId
    _brightcoveVIPVidId = 5840386487001; // VIP vidId

//  Animation vars
var _delay,
    _speed;

//  Menu numbers
var platinum_nav_num = 0,
    gold_nav_num = 1,
    whitecaviar_nav_num = 2,
    caviar_nav_num = 3,
    navBtnArray = [];

//  Section colors
var platinumColor = '#400F44',
    goldColor = '#9c8147',
    whitecaviarColor = '#cdcdcd',
    caviarColor = '#0c0257',
    genericColor = '#666666';

var _isFullVideo = false; // Switch to true to stop menu calls
var _isReplayed = false; // Switch to true if replayed

//  Tag info
var tagArray = [],
    menuViewedArray = [];

//  Asset locations
var assetLoc = '/creativeData/LaPrairie/';

globals.LP_SOUNDS = {
  SOUND_1: {
    id: "sound1",
    desc: "loop",
    src: assetLoc + "sounds/SOUND_A_TALE_OF_LUXURY_CHOICE_LOUDER.mp3"
  },
  SOUND_PLATINUM: {
    id: "soundPlatinum",
    desc: "loop",
    src: assetLoc + "sounds/VOICE_PLATINUM.mp3"
  },
  SOUND_GOLD: {
    id: "soundGold",
    desc: "loop",
    src: assetLoc + "sounds/VOICE_GOLD.mp3"
  },
  SOUND_WHITECAVIAR: {
    id: "soundWhitecaviar",
    desc: "loop",
    src: assetLoc + "sounds/VOICE_WHITE_CAVIAR.mp3"
  },
  SOUND_CAVIAR: {
    id: "soundCaviar",
    desc: "loop",
    src: assetLoc + "sounds/VOICE_CAVIAR.mp3"
  },
};
var muted = false;

var invFps;

module.exports = class BoilerplateModule extends BaseModule {

    constructor(args) {
        super(args);
        self = this;

        self.myjquery = window.$ ? window.$ : $;

        // Load css
        self.loadStyleHead(window.wirewax.moduleUrl + 'style/33147.css');

        // Vars
        self.widgetOverlay = $("#widget-overlay");

        $('#wirewax-logo').remove();
        $('#shares').remove();
        $("#play-button").remove();
        $("#pause-button").remove();

        // Load fonts
        self.toolkit.loadFont('creativeData/fonts/Helvetica_Neue_LT_W06_35_Thin/', 'Helvetica_Neue_LT_W06_35_Thin', 'Helvetica_Neue_LT_W06_35_Thin'); // General
        self.toolkit.loadFont('creativeData/fonts/Helvetica_Neue_LT_W06_25_UltLt/', 'Helvetica_Neue_LT_W06_25_UltLt', 'Helvetica_Neue_LT_W06_25_UltLt'); // General Thin
        self.toolkit.loadFont('creativeData/fonts/Helvetica_Neue_W20_45_Light/', 'Helvetica_Neue_W20_45_Light', 'Helvetica_Neue_W20_45_Light'); // Arabic
        //  External fonts (only work on the actual website?)
        self.fontLoader("//cc314b99-13b7-4957-80e9-f9e112216b35.js"); //Korean
        self.fontLoader("//e25f0f28-92ee-4852-bc33-8b168b5cd66d.js"); //Japanese
        self.fontLoader("//1a17f236-353a-48d6-ad75-fdcec244e46e.js"); //Hong Kong
        self.fontLoader("//8a6aebd7-56a6-4f78-8eb6-a1a6682d3729.js"); //Chinese

        //  Get Content (Language/Region/Data)
        self.getContent();

        //  Resize listener
        $(window).resize(function() {
            window.setTimeout(function(){
                self.onResize();
            }, 100);
        });

        //  Check resize from the beginning
        self.onResize();

    }

    fontLoader(_link) {
      requireShim.require([_link], function() {
        self.logTracer('font '+_link);
      });
    }

    //////////////////  BUILD POSTERFRAME  //////////////////
    buildPosterFrame() {
      // self.logTracer('buildPosterFrame');

      //  Setup content
      self.langLabel = 'label'+self.language; // Sets language label everywhere
      self.regionURL = 'url'+self.region; // Sets region URL everywhere

      var introPoster = _.where(self.posterImages, {customnameref: 'intro_background'})[0].menuimagedesktop1,
          introHeader = _.where(self.textLabel, {customnameref: 'intro_header'})[0][self.langLabel],
          introContent = _.where(self.textLabel, {customnameref: 'intro_content'})[0][self.langLabel],
          introCTA = _.where(self.textLabel, {customnameref: 'intro_cta'})[0][self.langLabel];

          //<img class="intro-img" src="${introPoster}"/>

      self.posterFrame = $(
        `<div class="intro-module">
          <div class="video-wrap"></div>
          <div class="intro-content">
            <bdo><div class="intro-header">${introHeader}</div></bdo>
            <bdo><div class="intro-subhead">${introContent}</div></bdo>
            <bdo><div class="intro-cta">${introCTA}</div></bdo>
          </div>
        </div>`
      );

      self.widgetOverlay.append(self.posterFrame);

      //  Elements
      self.introContent = self.posterFrame.find('.intro-content');
      self.introHeader = self.posterFrame.find('.intro-header');
      self.introSubhead = self.posterFrame.find('.intro-subhead');
      self.introBtn = self.posterFrame.find('.intro-cta');

      //  Set Font
      // self.setFont(self.introContent);

      //  Video-in-video player
      var videoId = _introVid; // Intro vidId

      var videoInVideo = [];
      videoInVideo = self.toolkit.createVideoInVideo(self.posterFrame.find('.video-wrap')[0], videoId, {
          autoPlay: true,
          // togglePlayOnClick: true,
          muted: true,
          controls: false, // Show default controls
          loop: true, // Loop video
          // customControls: true, // Show custom controls
          disableFullScreenButton: true, // Hide fullscreen button (not working)
          forceRendition: 1080
      });

      //  Build in listener if the video is playing
      var media = [];
      media = videoInVideo.$videoElement[0];

      //  Intro button
      self.introBtn.on('click', function() {
          self.startVideo();

          //  Call to website to expand the iFrame
          self.callFullscreen();
      });

      //  Hide BC large play button
      $('.vjs-big-play-button').addClass('controller-invisible');

      PubSub.subscribe(globals.HAS_PLAYED, function() {
        // self.hideMenu();
        self.hideMobileControls();
      });

      //  Set Font/layout for Arabic
      if(self.language == 'ar') {
        self.logTracer('Right-to-Left All text');

        // Adds class to the video, that will turn on all <bdo> text alignments
        $('#waxxer').addClass('rtl-align');
      }

    }

    //////////////////  START VIDEO  //////////////////
    startVideo() {
      _speed = 0.3;

      self.player.play();

      gsap.to(self.posterFrame, _speed, {autoAlpha:0, ease:Cubic.easeOut, onComplete:function(){
        self.widgetOverlay.empty();

        //  Setup menu version or VIP version
        if(window.wirewax.vidId == _choiceVid || self.brightcoveChecker(_brightcoveChoiceVidId) ) {
          self.setupMenuVideo();
        } else if(window.wirewax.vidId == _vipVid || self.brightcoveChecker(_brightcoveVIPVidId) ) {
          self.setupVIPVideo();
        }

        //  Setup endframe
        self.setupEndframe();

      }});


      //  Get all of the tags info
      self.tagsToCheck = _.filter(self.tagController.tags, function(tag) {
          tagArray.push(tag);
          return tag && tag.customNameRef;
      });


      //  Listen for the video end
      PubSub.subscribe(globals.VIDEO_END, function () {
        self.showEndframe();
      });

    }

    //  Check URL for Brightcove videoId
    brightcoveChecker = function(_brightcoveVidId) {
      //  Checks if it's the correct brightcove videoId
      var _isCorrectBrightcoveVidId = $(location).attr('href').indexOf(_brightcoveVidId) > -1; // also covers IE11
      return _isCorrectBrightcoveVidId;
    }


    //////////////////  MENU VIDEO  //////////////////
    setupMenuVideo() {
      self.logTracer('setupMenuVideo');

      //  Listen for the first menu
      invFps = 1 / self.videoData.metaData.fps;
      self.menuListener();

      //  Setup menu audio
      self.addAudio();

      //  Example bg image
      // var bgExample = assetLoc + 'images/mobile_menu_portrait_example.jpg';
      // <img class="menu-img" src="${bgExample}"/>

      self.choiceMenu = $(
        `<div class="menu-module invisible">
          <div class="menu-holder">
            <div class="platinum-pillar"></div>
            <div class="gold-pillar"></div>
            <div class="whitecaviar-pillar"></div>
            <div class="caviar-pillar"></div>
          </div>
          <div class="menu-topbar"></div>
          <div class="menu-botbar"></div>
          <bdo><div class="menu-headertext"></div></bdo>
          <bdo><div class="menu-playtext"></div></bdo>
        </div>`
      );

      self.widgetOverlay.append(self.choiceMenu);

      //  Set Font
      // self.setFont(self.widgetOverlay.find('.menu-module'));

      //  Create Menu content
      self.createMenu();

    }

    menuListener() {
      //  Section info
      self.platinumInfo = _.where(self.sectionContent, {customnameref: "section_platinum"})[0];
      self.goldInfo = _.where(self.sectionContent, {customnameref: "section_gold"})[0];
      self.whitecaviarInfo = _.where(self.sectionContent, {customnameref: "section_whitecaviar"})[0];
      self.caviarInfo = _.where(self.sectionContent, {customnameref: "section_caviar"})[0];
      self.fullVideoInfo = _.where(self.textLabel, {customnameref: "menu_full_video"})[0]; // Full Video

      //  Section timein
      self.platinum_start_time = self.toolkit.convertToSeconds(self.platinumInfo.timein, invFps);
      self.gold_start_time = self.toolkit.convertToSeconds(self.goldInfo.timein, invFps);
      self.whitecaviar_start_time = self.toolkit.convertToSeconds(self.whitecaviarInfo.timein, invFps);
      self.caviar_start_time = self.toolkit.convertToSeconds(self.caviarInfo.timein, invFps);
      self.fullvideo_start_time = self.toolkit.convertToSeconds(self.fullVideoInfo.timein, invFps); // Full Video start

      //  Section timeout
      self.platinum_end_time = self.toolkit.convertToSeconds(self.platinumInfo.timeout, invFps);
      self.gold_end_time = self.toolkit.convertToSeconds(self.goldInfo.timeout, invFps);
      self.whitecaviar_end_time = self.toolkit.convertToSeconds(self.whitecaviarInfo.timeout, invFps);
      self.caviar_end_time = self.toolkit.convertToSeconds(self.caviarInfo.timeout, invFps);

      //  First auto menu = 0.5 seconds before the platinum starting point
      self.menuStartTime = (self.platinum_start_time - 0.5);
      // self.logTracer(self.menuStartTime);

      self.player.subscribeToTime(self.menuStartTime, function(){
        self.showMenu();
      }, true);

      //  When seek is complete
      PubSub.subscribe(globals.HAS_SEEKED, function () {
          globals.PLAY_FUNCTION(true);
          self.hideMenu();
          self.logTracer('seeked');
      });

    }

    createMenu() {
      self.logTracer('createMenu');

      self.menuHeader = self.choiceMenu.find('.menu-topbar');
      self.menuFooter = self.choiceMenu.find('.menu-botbar');
      self.menuPlatinumPillar = self.choiceMenu.find('.platinum-pillar');
      self.menuGoldPillar = self.choiceMenu.find('.gold-pillar');
      self.menuWhitecaviarPillar = self.choiceMenu.find('.whitecaviar-pillar');
      self.menuCaviarPillar = self.choiceMenu.find('.caviar-pillar');
      self.menuHeaderText = self.choiceMenu.find('.menu-headertext');
      self.menuPlayText = self.choiceMenu.find('.menu-playtext');

      //  Menu labels
      self.menuHeaderLabel = _.where(self.textLabel, {customnameref: 'menu_header'})[0][self.langLabel]; // Menu header text
      self.menuFullVideoLabel = _.where(self.textLabel, {customnameref: 'menu_full_video'})[0][self.langLabel]; // Menu footer text
      self.menuWatchVideo = _.where(self.textLabel, {customnameref: 'menu_watch_video'})[0][self.langLabel]; // Pillar watch video text
      self.menuWatchAgain = _.where(self.textLabel, {customnameref: 'menu_watch_again'})[0][self.langLabel]; // Pillar watch again text
      self.menuCTA = _.where(self.textLabel, {customnameref: 'menu_cta'})[0][self.langLabel]; // Pillar CTA text
      self.videoGoBack = _.where(self.textLabel, {customnameref: 'video_go_back'})[0][self.langLabel]; // Video Go Back text
      self.tagSubText = _.where(self.textLabel, {customnameref: 'tag_subtext'})[0][self.langLabel]; // Tag subtext

      //  Set button array
      navBtnArray = [[self.menuPlatinumPillar,self.platinum_start_time,self.platinum_end_time,platinumColor,globals.LP_SOUNDS.SOUND_PLATINUM], [self.menuGoldPillar,self.gold_start_time,self.gold_end_time,goldColor,globals.LP_SOUNDS.SOUND_GOLD], [self.menuWhitecaviarPillar,self.whitecaviar_start_time,self.whitecaviar_end_time,whitecaviarColor,globals.LP_SOUNDS.SOUND_WHITECAVIAR], [self.menuCaviarPillar,self.caviar_start_time,self.caviar_end_time,caviarColor,globals.LP_SOUNDS.SOUND_CAVIAR]];

      self.createMenuButtons();
      self.createMenuBars();

      //  Setup buttons
      if(globals.IS_DESKTOP) {
        //
      } else {
        //  Mobile menu layouts
        // self.showMobileMenu();
        self.setupMenuLandscape(); // Default to landscape
        // self.setupMenuPortrait(); // Default to portrait
        self.widgetOverlay.find('.menu-module').addClass('menu-text-start'); // Default larger font on start
        self.onResize(); // Force a resize check for layout
      }

    }

    createMenuButtons() {

      $.each(navBtnArray, (i)=> {
        var thisPillar = navBtnArray[i][0]; //1st node is menu pillar div
        var thisSection = self.sectionContent[i];
        thisSection.pillarColor = navBtnArray[i][3]; //4th node is color
        thisSection.pillarSound = navBtnArray[i][4]; //5th node is voiceover sound

        //  Add section content
        self.pillarSectionContent = $(
          `<div class="pillar-holder">
            <div class="pillar-image"></div>
            <div class="pillar-image-watched invisible"></div>
            <div class="pillar-hover"></div>
            <div class="pillar-hitbox"></div>
            <div class="pillar-content">
              <div class="view-icon"></div>
              <bdo><div class="view-text"></div></bdo>
              <bdo><div class="pillar-label"></div></bdo>
              <bdo><div class="mobile-pillar-cta invisible"></div></bdo>
            </div>
            <bdo><div class="pillar-cta invisible"></div></bdo>
          </div>`
        );

        thisPillar.append(self.pillarSectionContent);

        //  Sets each section to watched false
        thisSection.watched = false;

        //  Add desktop styling
        // thisPillar.addClass('desktop-pillar');

        //  Add images
        thisSection.pillarWatchedImage = thisPillar.find('.pillar-image-watched');

        //  Add pillar content
        thisSection.pillarInfo = thisPillar.find('.pillar-content');
        thisSection.pillarIcon = thisSection.pillarInfo.find('.view-icon');
        thisSection.pillarText = thisSection.pillarInfo.find('.view-text');
        thisSection.pillarLabel = thisSection.pillarInfo.find('.pillar-label');
        thisSection.pillarHitbox = thisPillar.find('.pillar-hitbox');

        if(globals.IS_DESKTOP) {
          thisSection.pillarCTA = thisPillar.find('.pillar-cta');
        } else {
          thisSection.pillarCTA = thisPillar.find('.mobile-pillar-cta');
        }

        //  Add in info
        thisSection.pillarLabel.append(thisSection[self.langLabel]); // Add pillar label

        //  Add icon
        self.drawPlayIcon(thisSection.pillarIcon, thisSection.pillarColor);
        thisSection.iconCircle = thisSection.pillarIcon.find('.circle-bg');
        var pillarHover = thisPillar.find('.pillar-hover');

        //  Pillar button controls
        thisSection.pillarHitbox.on('click', ()=> {
            self.showSection(i);
        });

        // thisSection.pillarHitbox.hover(
        thisPillar.hover(

          function(){
            // self.logTracer('over');
            _speed = 0.4;
            gsap.to(thisSection.iconCircle, _speed, {autoAlpha:1, ease:Cubic.easeInOut});
            gsap.to(pillarHover, _speed, {autoAlpha:0.1, ease:Cubic.easeInOut});

            //  Play Voiceover
            self.playAudio(thisSection.pillarSound, false); // Plays voiceover sound
          },
          function(){
            // self.logTracer('out');
            _speed = 0.2;
            gsap.to([thisSection.iconCircle,pillarHover], _speed, {autoAlpha:0, ease:Cubic.easeInOut});
          }

        );


        //  Pillar CTA button controls
        thisSection.pillarClickout = thisSection[self.regionURL]; // Menu CTA url

        PubSub.subscribe(thisSection.customnameref, function(msg, data){
          self.CTAclickout(msg, data);
        });

        thisSection.pillarCTA.unbind();
        thisSection.pillarCTA.on(globals.CLICK_EVENT, function(e) {

          self.recordUiMetric(
              `ClickOutUrl <---> CTA ${thisSection.customnameref} <---> ${new Date()}`,
              self.appRef,
              globals.WIDGET_METRIC_TYPES.CLICK_OUT
          );

          PubSub.publish(thisSection.customnameref, [i, "Menu Button Click"]);
        });


        //  Update Circle Tag info
        self.tagsToCheck = _.filter(tagArray, function(tag) {
          //  If section name and tag custom name are the same - update info
          if(thisSection.customnameref == tag.customNameRef) {
            var sectionTag = $(tag.element);

            //  tag content
            var _tagHeaderText = sectionTag.find('.hotspot-headertext'),
                _tagSubText = sectionTag.find('.hotspot-subtext');

            _tagHeaderText.empty();
            _tagSubText.empty();
            _tagHeaderText.append(thisSection[self.langLabel]);
            _tagSubText.append(self.tagSubText);
          }

          var sectionTag = $(tag.element);
          var _goBackText = sectionTag.find('.goback-hotspot');
          //  Go Back video tag
          if(_goBackText) {
            _goBackText.empty();
            _goBackText.append(`<span>${self.videoGoBack}</span>`);
            // _goBackText.append(self.videoGoBack);
          }

        }); //tagsToCheck


        if(globals.IS_DESKTOP) {
          thisSection.pillarText.append(self.menuWatchVideo); // Add pillar label

          //  Style for Desktop
          thisPillar.addClass('desktop-pillar');
          thisPillar.find('.pillar-image').html($(`<img src="${thisSection.menuimagedesktop1}"/>`));
          thisSection.pillarWatchedImage.html($(`<img src="${thisSection.menuimagedesktop2}"/>`));
          thisSection.pillarInfo.addClass('desktop-pillar-content');

          thisPillar.hover(
            function(){
              _speed = 0.4;
              gsap.to(thisSection.pillarInfo, _speed, {css:{bottom:"18em"}, ease:Cubic.easeInOut});
            },
            function(){
              _speed = 0.4; //0.2
              gsap.to(thisSection.pillarInfo, _speed, {css:{bottom:"15em"}, ease:Cubic.easeInOut});
            }
          );

        } else {
          //  Style for Mobile
          thisSection.pillarText.remove();

          // self.showMobileMenu();
          thisPillar.addClass('mobile-pillar');
          thisPillar.find('.pillar-image').html($(`<img src="${thisSection.menuimagemobile1}"/>`));
          thisSection.pillarWatchedImage.html($(`<img src="${thisSection.menuimagemobile2}"/>`));
          thisSection.pillarInfo.addClass('mobile-pillar-content');
        }


      }); //each button setup end


      $.each(navBtnArray, (j)=> {

          //  Listens for the end of this section (3rd node is end time)
          self.player.subscribeToTime(navBtnArray[j][2], function(){
            // console.log(j);

            // var _currentTime = Math.floor(self.player.getCurrentTime() * 100) / 100;

            gsap.delayedCall(0.1, self.updatePillarWatched, [j]);

            //  Checks to see if fullVideo should play
            if(!_isFullVideo) {

                self.recordUiMetric(
                    `JumpPoint <---> Section End ${self.sectionContent[j].customnameref} <---> ${new Date()}`,
                    self.appRef,
                    globals.WIDGET_METRIC_TYPES.MEDIA_EXPAND
                );

                //  Update menu pillars
                self.showMenu();

            }

          }, true);

      });


      //  Listen for "video_go_back" tag
      PubSub.subscribe('video_go_back', function(msg, data){
        // self.CTAclickout(msg, data);

        self.recordUiMetric(
            `JumpPoint <---> Video Go Back <---> ${new Date()}`,
            self.appRef,
            globals.WIDGET_METRIC_TYPES.MEDIA_EXPAND
        );

        self.showMenu();
      });


    } //createMenuButtons()


    createMenuBars() {
    // createDesktopMenuBars() {
      //  Setup content
      self.menuHeaderText.append(self.menuHeaderLabel);

      self.menuPlayText.append(`<span>${self.menuFullVideoLabel}</span>`);

      //  Button for play full video
      self.menuPlayText.on('click', ()=> {
          self.playFullVideo();
      });


      if(globals.IS_DESKTOP) {
        //  Style for Desktop
        self.menuHeader.addClass('desktop-menu-topbar');
        self.menuFooter.addClass('desktop-menu-botbar');
        //  Desktop bars
        self.widgetOverlay.find('.menu-module').append('<div class="menu-bar1 menu-bar"></div><div class="menu-bar2 menu-bar"></div><div class="menu-bar3 menu-bar"></div><div class="menu-bar4 menu-bar"></div>');
      } else {
        //  Style for Mobile
        // self.showMobileMenu();
        // self.menuHeader.addClass('desktop-menu-topbar');
        // self.menuFooter.addClass('desktop-menu-botbar');
      }

    } //createMenuBars


    updatePillarWatched(_num) {
      self.logTracer('updatePillarWatched '+_num);

      //  Get the section
      var thisSection = self.sectionContent[_num];

      //  Update menu image
      thisSection.pillarWatchedImage.removeClass('invisible');

      //  Swap in replay icon
      thisSection.pillarIcon.empty();
      self.drawReplayIcon(thisSection.pillarIcon, thisSection.pillarColor);
      thisSection.iconCircle = thisSection.pillarIcon.find('.circle-bg');

      // //  Swap in replay text
      // thisSection.pillarText.empty();
      // thisSection.pillarText.append(self.menuWatchAgain); // Add pillar label

      if(globals.IS_DESKTOP) {
        //  Swap in replay text
        thisSection.pillarText.empty();
        thisSection.pillarText.append(self.menuWatchAgain); // Add pillar label

        // self.animateReplayIcon(thisSection.pillarIcon, thisSection.pillarHitbox);
      } else {
        //  Update text layout for mobile menu
        thisSection.pillarInfo.addClass('mobile-pillar-selected');
      }

      //  Show pillar CTA
      thisSection.pillarCTA.empty();
      thisSection.pillarCTA.append(self.menuCTA); // Add pillar label
      thisSection.pillarCTA.removeClass('invisible');

      //  Keep count of sections viewed
      menuViewedArray.push(_num);
      self.uniqueArray(menuViewedArray); // Sets unique numbers 1x
      menuViewedArray = self.uniqueArray(menuViewedArray);
      // console.log(menuViewedArray);

      if((menuViewedArray.length == navBtnArray.length) && (_isFullVideo == false)) {
      // if(menuViewedArray.length == navBtnArray.length) {
        self.logTracer('all sections viewed',menuViewedArray.length);

        _isFullVideo = true;

        // self.hideMenu();
        self.showEndframe();
      }

    }

    uniqueArray(list) {
      var result = [];
      $.each(list, function(i, e) {
          if ($.inArray(e, result) == -1) result.push(e);
      });

      return result;
    }


    setupMenuLandscape() {
      self.logTracer('setupMenuLandscape');

      //  Remove portrait
      self.widgetOverlay.find('.menu-module').removeClass('mobile-menu-module-portrait');

      // self.showMobileMenu();
      self.widgetOverlay.find('.menu-module').addClass('mobile-menu-module-landscape');
    }

    setupMenuPortrait() {
      self.logTracer('setupMenuPortrait');

      //  Remove landscape
      self.widgetOverlay.find('.menu-module').removeClass('menu-text-start'); // Default larger font on start
      self.widgetOverlay.find('.menu-module').removeClass('mobile-menu-module-landscape');

      // self.showMobileMenu();
      self.widgetOverlay.find('.menu-module').addClass('mobile-menu-module-portrait');
    }

    animateReplayIcon(_icon, _div) {
      // self.logTracer('animateReplayIcon '+ _icon);

      _div.hover(
        function(){
          _speed = 1.5;
          // console.log(_icon);
          gsap.to(_icon, _speed, {transformOrigin:'50% 50%', rotation:'360', repeat:-1, ease:Linear.easeNone});
        },
        function(){
          _speed = 1; //0.4
          gsap.to(_icon, _speed, {transformOrigin:'50% 50%', rotation:'0', ease:Cubic.easeInOut});
        }
      );

    }



    //////////////////  MENU ICONS  //////////////////
    drawPlayIcon(element, _bgColor) {
        var rsr = Raphael($(element)[0], '100%', '100%');
        rsr.setViewBox(0, 0, 100, 100);
    		// var rsr = Raphael('rsr', '100', '100');

        //  Set the bg circle color and class info
        var circle_a = rsr.circle(50, 50, 49);
        circle_a.attr({class: 'st0','stroke-width': '0','stroke-opacity': '1','fill': _bgColor, 'opacity': '0'}).data('id', 'circle_a');
        circle_a.node.setAttribute("class","circle-bg");

        // circle_a.attr({class: 'st0','stroke-width': '0','stroke-opacity': '1','fill': '#FFFFFF', 'opacity': '0.5'}).data('id', 'circle_a');
        var path_b = rsr.path("M50,100C22.4,100,0,77.6,0,50S22.4,0,50,0s50,22.4,50,50S77.6,100,50,100z M50,4.2C24.8,4.2,4.2,24.8,4.2,50  S24.8,95.8,50,95.8S95.8,75.2,95.8,50S75.2,4.2,50,4.2z");
        path_b.attr({class: 'st1','stroke-width': '0','stroke-opacity': '1','fill': '#FFFFFF'}).data('id', 'path_b');
        var path_c = rsr.path("M41.2,75.5c-0.5,0-1-0.1-1.5-0.4c-1.1-0.6-1.7-1.6-1.7-2.8V27.6c0-1.2,0.7-2.3,1.7-2.8S42,24.3,43,25l32.3,22.4  c0.9,0.6,1.4,1.6,1.4,2.6s-0.5,2-1.4,2.6L43,75C42.5,75.4,41.8,75.5,41.2,75.5z M42.3,29.6v40.7L71.6,50L42.3,29.6z M72.9,50.9  L72.9,50.9L72.9,50.9z");
        path_c.attr({class: 'st1','stroke-width': '0','stroke-opacity': '1','fill': '#FFFFFF'}).data('id', 'path_c');
        var rsrGroups = [];
    }

    drawReplayIcon(element, _bgColor) {
        var rsr = Raphael($(element)[0], '100%', '100%');
        rsr.setViewBox(0, 0, 100, 100);
    		// var rsr = Raphael('rsr', '100', '100');

        //  Set the bg circle color and class info
        var circle_h = rsr.circle(50, 50, 49);
        circle_h.attr({class: 'st0','stroke-width': '0','stroke-opacity': '1','fill': _bgColor, 'opacity': '0'}).data('id', 'circle_h');
        circle_h.node.setAttribute("class","circle-bg");

        var path_i = rsr.path("M50,100C22.4,100,0,77.6,0,50S22.4,0,50,0s50,22.4,50,50S77.6,100,50,100z M50,4.2C24.8,4.2,4.2,24.8,4.2,50  S24.8,95.8,50,95.8S95.8,75.2,95.8,50S75.2,4.2,50,4.2z");
        path_i.attr({class: 'st1','stroke-width': '0','stroke-opacity': '1','fill': '#FFFFFF'}).data('id', 'path_i');
        var group_a = rsr.set();
        group_a.attr({'name': 'group_a'});
        var group_b = rsr.set();
        group_b.attr({'parent': 'group_a','name': 'group_b'});
        var group_c = rsr.set();
        group_c.attr({'parent': 'group_a','name': 'group_c'});
        var group_d = rsr.set();
        var SVGID_1_ = rsr.path("M77.7,34.9L77.7,34.9c-1.1-0.4-2.4,0.1-2.8,1.2l-0.1,0.4c-2.2-4.7-5.6-8.6-10-11.4      c-6-3.8-13.2-5-20.1-3.4c-9.9,2.4-17.6,9.8-20.2,19.4c-0.2,0.6-0.1,1.2,0.2,1.7s0.7,0.9,1.3,1c1.1,0.3,2.3-0.4,2.6-1.6      c2.1-8,8.6-14.2,17-16.3c5.8-1.4,11.8-0.4,16.8,2.8c3.6,2.3,6.4,5.5,8.2,9.3l-0.5-0.2c-1.1-0.5-2.3-0.1-2.9,1      c-0.3,0.5-0.3,1.1-0.1,1.7c0.2,0.6,0.6,1,1.1,1.3l5.2,2.7l0.3,0.2c0.3,0.1,0.5,0.2,0.8,0.2c0.9,0,1.7-0.5,2-1.4l2.2-5.7      c0.2-0.5,0.2-1.2,0-1.7C78.6,35.6,78.2,35.2,77.7,34.9z").attr({id: 'SVGID_1_',class: 'st1',parent: 'group_a','stroke-width': '0','stroke-opacity': '1','fill': '#FFFFFF'}).data('id', 'SVGID_1_');
        group_d.attr({'parent': 'group_a','name': 'group_d'});
        var group_e = rsr.set();
        group_e.attr({'parent': 'group_a','name': 'group_e'});
        var group_f = rsr.set();
        group_f.attr({'parent': 'group_a','name': 'group_f'});
        var group_g = rsr.set();
        var SVGID_3_ = rsr.path("M74,56.2L74,56.2c-1.1-0.3-2.3,0.4-2.6,1.5c-2.1,8-8.7,14.2-17,16.2      c-5.8,1.4-11.8,0.4-16.8-2.8c-3.6-2.3-6.4-5.5-8.2-9.3l0.5,0.3c1.1,0.5,2.3,0.1,2.9-1c0.3-0.5,0.3-1.1,0.1-1.7      c-0.2-0.6-0.6-1-1.1-1.3l-5.2-2.7l-0.3-0.1c-0.5-0.2-1.1-0.2-1.6,0s-0.9,0.7-1.2,1.2l-2.2,5.7c-0.4,1.1,0.1,2.4,1.2,2.9      c1.1,0.4,2.4-0.1,2.8-1.2l0.1-0.4c2.2,4.7,5.6,8.6,10,11.4c4.2,2.7,9,4.1,14,4.1c2,0,4.1-0.2,6.1-0.7      c9.9-2.4,17.7-9.8,20.2-19.3c0.2-0.6,0.1-1.2-0.2-1.7C75,56.7,74.6,56.4,74,56.2z").attr({id: 'SVGID_3_',class: 'st1',parent: 'group_a','stroke-width': '0','stroke-opacity': '1','fill': '#FFFFFF'}).data('id', 'SVGID_3_');
        group_g.attr({'parent': 'group_a','name': 'group_g'});


        var rsrGroups = [group_a,group_b,group_c,group_d,group_e,group_f,group_g];
        group_a.push();
        group_b.push();
        group_c.push();
        group_d.push(SVGID_1_);
        group_e.push();
        group_f.push();
        group_g.push(SVGID_3_);
    }

    drawCloseIcon(element) {
        var rsr = Raphael($(element)[0], '100%', '100%');
        rsr.setViewBox(0, 0, 32, 32);

        // var rsr = Raphael('rsr', '32', '32');
        var Fill2 = rsr.path("M31.5,0.5c-0.6-0.6-1.6-0.6-2.3,0L16,13.7L2.7,0.5c-0.6-0.6-1.6-0.6-2.3,0c-0.6,0.6-0.6,1.6,0,2.3 L13.7,16L0.5,29.3c-0.6,0.6-0.6,1.6,0,2.3C0.8,31.8,1.2,32,1.6,32c0.4,0,0.8-0.2,1.1-0.5L16,18.3l13.3,13.3c0.3,0.3,0.7,0.5,1.1,0.5 s0.8-0.2,1.1-0.5c0.6-0.6,0.6-1.6,0-2.3L18.3,16L31.5,2.7C32.2,2.1,32.2,1.1,31.5,0.5z");
        Fill2.attr({id: 'Fill-2',class: 'st0','stroke-width': '0','stroke-opacity': '1','fill': '#FFFFFF'}).data('id', 'Fill2'); var rsrGroups = [];
        Fill2.node.setAttribute("class","full-svg");
    }



    //////////////////  VIP EMAIL VIDEO  //////////////////
    setupVIPVideo() {
      self.logTracer('setupVIPVideo');

      //  Update Circle Tag info
      self.tagVIPtext = _.where(self.textLabel, {customnameref: 'tag_vip'})[0][self.langLabel]; // Hotspot Tag header
      self.tagsToCheck = _.filter(tagArray, function(tag) {
        //  If section name and tag custom name are the same - update info
        if(tag.customNameRef == 'tag_vip') {
          var sectionTag = $(tag.element);

          //  tag content
          var _tagHeaderText = sectionTag.find('.hotspot-headertext');

          _tagHeaderText.empty();
          _tagHeaderText.append(self.tagVIPtext);
        }

      }); //tagsToCheck

      self.setupVIPoverlay();

    }

    setupVIPoverlay() {
      self.logTracer('setupVIPoverlay');

      //  VIP overlay (only grabbing from the platinum list)
      self.overlaySection = _.where(self.sectionContent, {customnameref: 'section_platinum'});
      self.overlaySectionImages = _.where(self.sectionImages, {customnameref: 'section_platinum'});

      self.overlayDesktopImg = self.overlaySectionImages[0].overlayimagedesktop; // Desktop overlay image
      self.overlayMobileImg = self.overlaySectionImages[0].overlayimagemobile1; // Mobile landscape overlay image
      self.overlayMobileVertImg = self.overlaySectionImages[0].overlayimagemobile2; // Mobile portrait overlay image
      self.overlayHeader = _.where(self.textLabel, {customnameref: 'overlay_header'})[0][self.langLabel]; // Overlay header
      self.overlayText = _.where(self.textLabel, {customnameref: 'overlay_text'})[0][self.langLabel]; // Overlay content
      self.overlayCTAtext = _.where(self.textLabel, {customnameref: 'overlay_cta'})[0][self.langLabel]; // Overlay CTA text
      // console.log(self.overlayCTAtext);

      //  Example bg image
      // var bgExample = assetLoc + 'images/overlay_mobile_portrait_example.jpg';
      // <img class="overlay-img-set" src="${bgExample}"/>

      self.overlayMenu = $(
        `<div class="overlay-module invisible">
          <div class="overlay-bg"></div>
          <div class="overlay-bg-box"></div>
          <div class="overlay-img"></div>
          <div class="overlay-content">
            <bdo><div class="overlay-header">${self.overlayHeader}</div></bdo>
            <bdo><div class="overlay-text">${self.overlayText}</div></bdo>
            <bdo><div class="overlay-cta">${self.overlayCTAtext}</div></bdo>
          </div>
          <div class="overlay-close"></div>
        </div>`
      );

      self.widgetOverlay.append(self.overlayMenu);

      //  Overlay content
      self.overlayModuleHolder = self.overlayMenu.find('.overlay-module');
      self.overlayBG = self.overlayMenu.find('.overlay-bg');
      self.overlayBGBox = self.overlayMenu.find('.overlay-bg-box');
      self.overlayImage = self.overlayMenu.find('.overlay-img');
      self.overlayContent = self.overlayMenu.find('.overlay-content');
      self.overlayHeaderTxt = self.overlayMenu.find('.overlay-header');
      self.overlayContentTxt = self.overlayMenu.find('.overlay-text');
      self.overlayCTA = self.overlayMenu.find('.overlay-cta');
      self.overlayClose = self.overlayMenu.find('.overlay-close');

      //  Set Font/layout for Arabic
      if(self.language == 'ar') {
        self.logTracer('Right-to-Left overlay');
        self.overlayContent.addClass('right-to-left-text');
        self.overlayCTA.addClass('right-to-left-div');

        // $('#waxxer').addClass('rtl-align');
        // console.log($('#waxxer'));
      }

      // self.setFont(self.overlayModuleHolder);

      //  Create close X
      self.drawCloseIcon(self.overlayClose);
      self.overlayCloseIcon = self.overlayClose.find('.full-svg');

      //  Styling changes depending on devices
      if(globals.IS_DESKTOP) {
        self.overlayBGBox.addClass('desktop-overlay-module');
        self.overlayImage.html(`<img class="overlay-img-set" src="${self.overlayDesktopImg}"/>`);
      } else {
        //  Style for mobile (landscape)
        self.setupVIPoverlayPortrait(); // Default to portrait
        self.overlayContentTxt.addClass('overlay-text-start-landscape'); // Default larger font on start
        self.overlayContentTxt.addClass('overlay-text-start-portrait'); // Default larger font on start
        // self.overlayContentTxt.addClass('overlay-text-start'); // Default larger font on start
        self.onResize(); // Force a resize check for layout
      }


      //  Listen for "tag_vip" tag
      PubSub.subscribe('tag_vip', function(msg, data){
        // self.CTAclickout(msg, data);
        self.showVIPoverlay();
      });

      //  Overlay CTA click
      self.overlayCTA.unbind();
      self.overlayCTA.on('click', ()=> {
          self.hideVIPoverlay();

          self.recordUiMetric(
              `MenuOverlay <---> Overlay CTA Clicked <---> ${new Date()}`,
              self.appRef,
              globals.WIDGET_METRIC_TYPES.MEDIA_CLOSE
          );

      });

      //  Overlay background click
      self.overlayBG.unbind();
      self.overlayBG.on('click', ()=> {
          self.hideVIPoverlay();

          self.recordUiMetric(
              `MenuOverlay <---> Overlay Background Clicked <---> ${new Date()}`,
              self.appRef,
              globals.WIDGET_METRIC_TYPES.MEDIA_CLOSE
          );

      });

      //  Overlay close click
      self.overlayClose.unbind();
      self.overlayClose.on('click', ()=> {
          self.hideVIPoverlay();

          self.recordUiMetric(
              `MenuOverlay <---> Close Button Clicked <---> ${new Date()}`,
              self.appRef,
              globals.WIDGET_METRIC_TYPES.MEDIA_CLOSE
          );

      });

      self.overlayClose.hover(
        function(){
          _speed = 0.4;
          gsap.to(self.overlayCloseIcon, _speed, {fill:goldColor, transformOrigin:'50% 50%', rotation:'90', ease:Cubic.easeInOut});
        },
        function(){
          _speed = 0.4; //0.2
          gsap.to([self.overlayCloseIcon], _speed, {fill:'#FFFFFF', transformOrigin:'50% 50%', rotation:'0', ease:Cubic.easeInOut});
        }
      );


    }

    showVIPoverlay() {
      self.logTracer('showVIPoverlay');

      self.recordUiMetric(
          `MenuOverlay <---> Open VIP Overlay <---> ${new Date()}`,
          self.appRef,
          globals.WIDGET_METRIC_TYPES.MEDIA_EXPAND
      );

      //  Setup buttons
      if(globals.IS_DESKTOP) {
        //
      } else {
        //  Mobile menu layouts
        self.showMobileMenu();
      }

      self.player.pause();

      //  Hide BC Controls
      self.hideBCcontrols();

      self.overlayMenu.removeClass('invisible');
      gsap.fromTo(self.overlayMenu, 0.5, {autoAlpha:0}, {autoAlpha:1, ease:Cubic.easeInOut});

      //  Animate elements
      _delay = 0;
      _speed = 0.3;

      gsap.fromTo(self.overlayBGBox, _speed, {scale:0.5, autoAlpha:0, transformOrigin:'50% 50%', xPercent:-50, yPercent:-50, left:'50%', top:'50%'}, {scale:1, autoAlpha:1, ease:Cubic.easeOut, delay:_delay});
      gsap.fromTo(self.overlayImage, _speed, {scale:0.5, autoAlpha:0, transformOrigin:'50% 50%'}, {scale:1, autoAlpha:1, ease:Cubic.easeOut, delay:_delay += 0.2});
      gsap.fromTo(self.overlayHeaderTxt, _speed, {x:'-20', autoAlpha:0}, {x:'0', autoAlpha:1, ease:Cubic.easeOut, delay:_delay += 0.1});
      gsap.fromTo(self.overlayContentTxt, _speed, {x:'-20', autoAlpha:0}, {x:'0', autoAlpha:1, ease:Cubic.easeOut, delay:_delay += 0.1});
      gsap.fromTo(self.overlayCTA, _speed, {x:'-20', autoAlpha:0}, {x:'0', autoAlpha:1, ease:Cubic.easeOut, delay:_delay += 0.1});
      gsap.fromTo(self.overlayClose, _speed, {scale:0.5, autoAlpha:0, transformOrigin:'50% 50%'}, {scale:1, autoAlpha:1, ease:Cubic.easeOut, delay:_delay += 0.1});


      //  Mimic widget call
      PubSub.publish(globals.WIDGET_SHOWN);
      $('#tag-overlay').addClass('invisible');
      $('#bottom-button-bar').addClass('invisible');

    }

    hideVIPoverlay() {
      self.logTracer('hideVIPoverlay');

      gsap.to(self.overlayMenu, 0.3, {autoAlpha:0, ease:Cubic.easeInOut, onComplete:function(){
        self.overlayMenu.addClass('invisible');
        $('#tag-overlay').removeClass('invisible');
        $('#bottom-button-bar').removeClass('invisible');

        self.recordUiMetric(
            `MenuOverlay <---> Close Vip Overlay <---> ${new Date()}`,
            self.appRef,
            globals.WIDGET_METRIC_TYPES.MEDIA_CLOSE
        );

        //  Show BC Controls
        self.showBCcontrols();
      }});

      //  Mimic widget call
      PubSub.publish(globals.WIDGET_CLOSED);

    }

    setupVIPoverlayLandscape() {
      self.logTracer('setupVIPoverlayLandscape');

      //  Remove portrait
      if(globals.IS_SAFARI) self.overlayContentTxt.removeClass('overlay-text-start-portrait'); // Default larger font on start

      // self.showMobileMenu();
      self.widgetOverlay.find('.overlay-module').removeClass('mobile-overlay-module-portrait');
      self.widgetOverlay.find('.overlay-module').addClass('mobile-overlay-module-landscape');
      self.overlayImage.html(`<img class="overlay-img-set" src="${self.overlayMobileImg}"/>`);
    }

    setupVIPoverlayPortrait() {
      self.logTracer('setupVIPoverlayPortrait');

      if(globals.IS_SAFARI) self.overlayContentTxt.removeClass('overlay-text-start-landscape'); // Default larger font on start

      self.widgetOverlay.find('.overlay-module').removeClass('mobile-overlay-module-landscape');
      self.widgetOverlay.find('.overlay-module').addClass('mobile-overlay-module-portrait');
      self.overlayImage.html(`<img class="overlay-img-set" src="${self.overlayMobileVertImg}"/>`);

    }



    //////////////////  ENDFRAME  //////////////////
    setupEndframe() {
      self.logTracer('setupEndframe');
      //  Endframe content
      self.endframeTitle = _.where(self.textLabel, {customnameref: 'endframe_title'})[0][self.langLabel]; // Endframe title
      self.endframeCTA = _.where(self.textLabel, {customnameref: 'endframe_cta'})[0][self.langLabel]; // Endframe CTA
      self.endframeCTAURL = _.where(self.textLabel, {customnameref: 'endframe_cta'})[0][self.regionURL]; // Endframe CTA URL
      self.endframeReplay = _.where(self.textLabel, {customnameref: 'endframe_replay'})[0][self.langLabel]; // Endframe replay
      self.endframeImage = _.where(self.posterImages, {customnameref: 'endframe_background'})[0].menuimagedesktop1; // Endframe background image
      // self.logTracer(self.endframeCTAURL);

      //  Example bg image
      // var bgExample = assetLoc + 'images/desktop_endframe_example.jpg';

      self.endframe = $(
        `<div class="endframe-module invisible">
          <img class="endframe-img" src="${self.endframeImage}" />
          <div class="endframe-content">
            <bdo><div class="endframe-header">${self.endframeTitle}</div></bdo>
            <bdo><div class="endframe-cta">${self.endframeCTA}</div></bdo>
          </div>
          <div class="endframe-replay">
            <div class="endframe-replay-icon"></div>
            <bdo><div class="endframe-replay-text">${self.endframeReplay}</div></bdo>
          </div>
        </div>`
      );

      self.widgetOverlay.append(self.endframe);

      //  Set Font
      // self.setFont(self.endframe.find('.endframe-module'));

      self.endframeHeader = self.endframe.find('.endframe-header');

      //  Endframe CTA
      self.endframeCTAButton = self.endframe.find('.endframe-cta');
      self.endframeCTAButton.on(globals.CLICK_EVENT, function(e) {
          //  Track endframe CTA click
          self.doClickout(self.endframeCTAURL, "Endframe CTA Button Click", true);
      });


      //  Replay icon
      self.endframeReplayButton = self.endframe.find('.endframe-replay');
      var replayIcon = self.endframeReplayButton.find('.endframe-replay-icon');

      // replayIcon.empty();
      self.drawReplayIcon(replayIcon, genericColor);
      self.endframeReplayCircle = replayIcon.find('.circle-bg');


      //  Replay button controls
      self.endframeReplayButton.unbind();
      self.endframeReplayButton.on('click', ()=> {
          self.replayVideo();
      });

      self.endframeReplayButton.hover(

        function(){
          // self.logTracer('over');
          _speed = 0.4;
          gsap.to(self.endframeReplayCircle, _speed, {autoAlpha:1, ease:Cubic.easeInOut});
        },
        function(){
          // self.logTracer('out');
          _speed = 0.2;
          gsap.to([self.endframeReplayCircle], _speed, {autoAlpha:0, ease:Cubic.easeInOut});
        }

      );


    }

    showEndframe() {
      self.logTracer('showEndframe');

      self.recordUiMetric(
          `EndFrame <---> Open <---> ${new Date()}`,
          self.appRef,
          globals.WIDGET_METRIC_TYPES.MEDIA_EXPAND
      );

      //  Remove mobile fullscreen
      self.hideMobileMenu();

      //  If Choice video - then completely remove the menu + sounds
      if(self.choiceMenu) {
        self.choiceMenu.addClass('invisible');
        self.hideMenu(); // Hide menu + stop sounds
      }

      self.endframe.removeClass('invisible');
      gsap.fromTo(self.endframe, 1, {autoAlpha:0}, {autoAlpha:1, ease:Cubic.easeInOut});

      //  Hide BC Controls
      self.hideBCcontrols();

      //  Animate elements
      _delay = 0.5;
      _speed = 0.3;

      gsap.fromTo(self.endframeHeader, _speed, {scale:0.5, autoAlpha:0, transformOrigin:'50% 50%'}, {scale:1, autoAlpha:1, ease:Cubic.easeOut, delay:_delay});
      gsap.fromTo(self.endframeCTAButton, _speed, {scale:0.5, autoAlpha:0, transformOrigin:'50% 50%', xPercent:-50, left:'50%'}, {scale:1, autoAlpha:1, ease:Cubic.easeOut, delay:_delay += 0.1});
      gsap.fromTo(self.endframeReplayButton, _speed, {scale:0.5, autoAlpha:0, transformOrigin:'50% 50%', xPercent:-50, left:'50%'}, {scale:1, autoAlpha:1, ease:Cubic.easeOut, delay:_delay += 0.1});


      if(window.wirewax.vidId == _choiceVid) {
      // if(self.player.vidId == _choiceVid) {
        self.choiceMenu.addClass('invisible');
      }

    }

    hideEndframe() {
      self.logTracer('hideEndframe');

      gsap.to(self.endframe, 0.3, {autoAlpha:0, ease:Cubic.easeInOut, onComplete:function(){
        self.endframe.addClass('invisible');
        self.player.play();

        //  Show BC Controls
        self.showBCcontrols();
      }});

    }

    replayVideo() {
      self.logTracer('replayVideo');

      self.recordUiMetric(
          `JumpPoint <---> Replay Video <---> ${new Date()}`,
          self.appRef,
          globals.UI_EVENTS.ENDCARD_REPLAY
      );

      //  Seeks to the section start frame
      // PubSub.publishSync(globals.DO_SEEK, self.replay_time); //Video start (00:00:00:10)
      PubSub.publishSync(globals.DO_SEEK, self.toolkit.convertToSeconds('00:00:00:10', invFps)); //Video start (00:00:00:01)

      self.hideEndframe();

      //  Reset video
      _isFullVideo = false;
      menuViewedArray = []; // Empty array
      // _isReplayed = true;

      //  Setup menu version
      if(window.wirewax.vidId == _choiceVid) {
      // if(self.player.vidId == _choiceVid) {
        self.hideMenu();
        self.resetMenu();
      }

    }

    resetMenu() {
      self.logTracer('resetMenu');

      //  Reset menu buttons
      $.each(navBtnArray, (i)=> {
        var thisPillar = navBtnArray[i][0]; //1st node is menu pillar div
        var thisSection = self.sectionContent[i];

        //  Update menu image
        thisSection.pillarWatchedImage.addClass('invisible');
        thisPillar.find('.pillar-image-watched').addClass('invisible');

        //  Swap in replay icon
        thisSection.pillarIcon.empty();
        self.drawPlayIcon(thisSection.pillarIcon, thisSection.pillarColor);
        thisSection.iconCircle = thisSection.pillarIcon.find('.circle-bg');
        // console.log(thisSection.pillarIcon);

        if(globals.IS_DESKTOP) {
          //  Swap in replay text
          thisSection.pillarText.empty();
          thisSection.pillarText.append(self.menuWatchVideo); // Add pillar label
        }

        //  Show pillar CTA
        thisSection.pillarCTA.addClass('invisible');

      });


    }

    //////////////////  MOBILE LAYOUT  ////////////////
    showMobileMenu() {
      self.logTracer('showMobileMenu');

      //  Hide BC Controls
      self.hideBCcontrols();

      //  Mobile menu layouts
      self.widgetOverlay.addClass('widget-overlay-mobile'); // This forces a responsive mobile overlay
      // self.widgetOverlay.find('.menu-module').addClass('widget-overlay-mobile'); // This forces a responsive mobile overlay
    }

    hideMobileMenu() {
      self.logTracer('hideMobileMenu');

      //  Show BC Controls
      self.showBCcontrols();

      //  Mobile menu layouts
      self.widgetOverlay.removeClass('widget-overlay-mobile'); // This forces a responsive mobile overlay
    }



    //////////////////  MENU NAVIGATION  //////////////////
    showMenu() {
      self.logTracer('showMenu');

      self.recordUiMetric(
          `MenuOverlay <---> Open <---> ${new Date()}`,
          self.appRef,
          globals.WIDGET_METRIC_TYPES.MEDIA_EXPAND
      );

      //  Setup buttons
      if(globals.IS_DESKTOP) {
        //
        // self.showMobileMenu(); // TEST
      } else {
        //  Mobile menu layouts
        self.showMobileMenu();
      }

      self.player.pause();

      //  Hide BC Controls
      self.hideBCcontrols();

      self.choiceMenu.removeClass('invisible');
      // gsap.fromTo(self.choiceMenu, 1, {autoAlpha:0}, {autoAlpha:1, ease:Cubic.easeInOut});
      gsap.fromTo(self.choiceMenu, 1, {autoAlpha:0}, {autoAlpha:1, ease:Cubic.easeInOut, onComplete:function(){
        //  Start audio
        muted ? null : self.playAudio(globals.LP_SOUNDS.SOUND_1, true);
        self.toggleAudio(true); // Start music
      }});

      //  Shuts off fullVideo view
      _isFullVideo = false;
    }

    hideMenu() {
      self.toggleAudio(false); // Stop music

      gsap.to(self.choiceMenu, 0.3, {autoAlpha:0, ease:Cubic.easeInOut, onComplete:function(){
        self.choiceMenu.addClass('invisible');

        self.recordUiMetric(
            `MenuOverlay <---> Close <---> ${new Date()}`,
            self.appRef,
            globals.WIDGET_METRIC_TYPES.MEDIA_CLOSE
        );

        //  Show BC Controls
        self.showBCcontrols();
      }});

    }

    showSection(_num) {
      self.logTracer('showSection '+ _num);

      //  Get the section
      var thisSection = self.sectionContent[_num];

      //  Seeks to the section start frame
      PubSub.publishSync(globals.DO_SEEK, navBtnArray[_num][1]); //2nd node is start time

      self.recordUiMetric(
          `JumpPoint <---> Play Section ${thisSection.customnameref} <---> ${new Date()}`,
          self.appRef,
          globals.WIDGET_METRIC_TYPES.MEDIA_PLAY
      );

      self.logTracer(thisSection.watched);

    }

    playFullVideo() {
      self.logTracer('playFullVideo');

      //  Go to the first by default
      _isFullVideo = true;

      //  Seeks to the section start frame
      PubSub.publishSync(globals.DO_SEEK, self.fullvideo_start_time); // Full Video start time

      self.recordUiMetric(
          `JumpPoint <---> Play Full Video <---> ${new Date()}`,
          self.appRef,
          globals.WIDGET_METRIC_TYPES.MEDIA_PLAY
      );

    }

    //////////  AUDIO SETTINGS  //////////
    addAudio() {
      self.logTracer('addAudio');
      $.each(globals.LP_SOUNDS, function(k, v) {
        let sound = this;
        $("#waxxer").append(
          '<audio class="audio" style="display: none;" id="' +
            sound.id +
            '" src="' +
            sound.src +
            '"></audio>'
        );
      });
    }

    toggleAudio(state) {
      if (state) {
        //muted = false;
        self.playAudio(globals.LP_SOUNDS.SOUND_1, true);
      } else {
        //muted = true;
        self.pauseAudio(globals.LP_SOUNDS.SOUND_1);
      }
    }

    playAudio(sound, loop) {
      if (globals.VOLUME === null) {
        // if explicitly undefined/null, as if muted it returns 0, which is correct.
        globals.VOLUME = 1;
      }
      if (loop) {
        $("#waxxer #" + sound.id).attr("loop", true);
      }
      let audio = $("#waxxer #" + sound.id)[0];
      let volume = globals.VOLUME;
      //for resumeing muted audio
      if(audio.volume != 0 ){
        // audio.volume = volume * 0.5;
        audio.volume = volume * 1;
      }
      if (!$("#waxxer #" + sound.id).attr("loop")) {
        if (!isNaN(audio.duration)) {
          audio.currentTime = 0;
        }
      }
      audio.play();
    }

    pauseAudio(sound) {
      if ($("#waxxer #" + sound.id).length) {
        $("#waxxer #" + sound.id)[0].pause();
      }
    }


    //////////////////  SHARED PUBSUB CLICKOUTS  //////////////////
    CTAclickout(msg, data) {
      // console.log(msg, data);
      var _num = data[0], // Section number
          _str = data[1]; // Button tracking string (ex: Menu Button Click)

      var _clickout; // Label tracking string (ex: platinum)
      var _url = self.sectionContent[_num][self.regionURL]; // Section clickout URL
      // self.logTracer(_url);

      switch (_num) {
        case platinum_nav_num:
          _clickout = 'platinum';
          break;
        case gold_nav_num:
          _clickout = 'gold';
          break;
        case whitecaviar_nav_num:
          _clickout = 'whitecaviar';
          break;
        case caviar_nav_num:
          _clickout = 'caviar';
          break;
      }

      self.doClickout(_url, _str + " - " + _clickout, true);
      // self.doClickout(thisSection.pillarClickout, "Menu Button Click - " + thisSection.customnameref, true);
    }


    //////////////////  GET CONTENT  //////////////////
    getContent() {
      //  Get locale string vidId=9999999&locale=en_us for example
      var _localeArray = [];

      //  check for locale first
      if(window.wirewax.locale) {
        _localeArray = window.wirewax.locale.split('_'); // Split by the underscore
      } else {
        _localeArray = self.getLocale('locale').split('_'); // Split by the underscore
      }

      //  Do something special for en_hk-en
      if(window.wirewax.locale == 'en_hk-en') {
        //  Set language option manually
        if(!self.language) self.language = self.getLanguage('hk-en');
      } else {
        if(!self.language) self.language = self.getLanguage(_localeArray[0]);
      }

      self.logTracer(_localeArray);

      //  Get the language and region
      if(!self.region) self.region = self.getRegion(_localeArray[1]);

      //  Get the data
      if(self.language && self.region) self.getModuleData();
    }

    getLocale(_string) {
      //  If we wanted to get the string outside of WWX
      return (window.location.search.split(_string + '=')[1] || '').split('&')[0];
    }

    getLanguage(_lang) {
      if(!_lang) _lang = 'en'; // Backup if string is missing
      var langCheck = _lang.toLowerCase();

      var currLanguage;

      switch (langCheck) {
        case 'en':
          //  English
          currLanguage = 'en';
          // $('#video-container').addClass('default-font');
          self.getFont('default-font');
          break;
        case 'ar':
          //  Arabic
          currLanguage = 'ar';
          self.getFont('arabic-font');
          break;
        case 'de':
          //  German
          currLanguage = 'de';
          self.getFont('default-font');
          break;
        case 'el':
          //  Greek
          currLanguage = 'el';
          self.getFont('default-font');
          break;
        case 'es':
          //  Spanish
          currLanguage = 'es';
          self.getFont('default-font');
          break;
        case 'fr':
          //  French
          currLanguage = 'fr';
          self.getFont('default-font');
          break;
        case 'hk':
          //  HK Cantonese
          currLanguage = 'hk';
          self.getFont('hk-font');
          break;
        case 'hk-en':
          //  HK English
          currLanguage = 'hk-en';
          self.getFont('default-font');
          break;
        case 'it':
          //  Italian
          currLanguage = 'it';
          self.getFont('default-font');
          break;
        case 'ja':
          //  Japanese
          currLanguage = 'ja';
          self.getFont('japanese-font');
          break;
        case 'ko':
          //  Korean
          currLanguage = 'ko';
          self.getFont('korean-font');
          break;
        case 'nl':
          //  Dutch
          currLanguage = 'nl';
          self.getFont('default-font');
          break;
        case 'pt':
          //  Portuguese
          currLanguage = 'pt';
          self.getFont('default-font');
          break;
        case 'ru':
          //  Russian
          currLanguage = 'ru';
          self.getFont('default-font');
          break;
        case 'tw':
          //  Traditional Chinese
          currLanguage = 'tw';
          self.getFont('chinese-font');
          break;
        case 'zh':
          //  Simplified Chinese
          currLanguage = 'zh';
          self.getFont('chinese-font');
          break;
        case 'zh-man':
          //  Mandarin Chinese
          currLanguage = 'zh-man';
          self.getFont('chinese-font');
          break;
        default:
          //  English
          currLanguage = 'en';
          self.getFont('default-font');
      }

      self.logTracer('currLanguage '+currLanguage);
      return currLanguage;
    }

    getRegion(_region) {
      if(!_region) _region = 'us'; // Backup if string is missing
      var regionCheck = _region.toLowerCase();
      var currRegion;

      switch (regionCheck) {
        case 'au':
          //  Australia
          currRegion = 'au';
          break;
        case 'cn':
          //  China
          currRegion = 'cn';
          break;
        case 'fr':
          //  France
          currRegion = 'fr';
          break;
        case 'de':
          //  Germany
          currRegion = 'de';
          break;
        case 'gb':
          //  United Kingdom
          currRegion = 'gb';
          break;
        case 'us':
          //  US
          currRegion = 'us';
          break;
        case 'int-en':
          //  International (English)
          currRegion = 'int-en';
          break;
        case 'int-zh':
          //  International (Chinese)
          currRegion = 'int-zh';
          break;
        case 'at':
          //  Austria
          currRegion = 'at';
          break;
        case 'gr':
          //  Greece
          currRegion = 'gr';
          break;
        case 'hk-en':
          //  Hong Kong (English)
          currRegion = 'hk-en';
          break;
        case 'hk-zh':
          //  Hong Kong (Hong Kong)
          currRegion = 'hk';
          break;
        case 'it':
          //  Italy
          currRegion = 'it';
          break;
        case 'jp':
          //  Japan
          currRegion = 'jp';
          break;
        case 'kr':
          //  Korea
          currRegion = 'kr';
          break;
        case 'ae':
          //  Middle East
          currRegion = 'ae';
          break;
        case 'nl':
          //  Netherlands
          currRegion = 'nl';
          break;
        case 'pt':
          //  Portugal
          currRegion = 'pt';
          break;
        case 'ru':
          //  Russia
          currRegion = 'ru';
          break;
        case 'es':
          //  Spain
          currRegion = 'es';
          break;
        case 'ch-de':
          //  Switzerland (German)
          currRegion = 'ch-de';
          break;
        case 'ch-it':
          //  Switzerland (Italian)
          currRegion = 'ch-it';
          break;
        case 'ch-fr':
          //  Switzerland (French)
          currRegion = 'ch-fr';
          break;
        case 'tw':
          //  Taiwan
          currRegion = 'tw';
          break;
        default:
        //  US
        currRegion = 'us';
      }

      self.logTracer('currRegion '+currRegion);
      return currRegion;
    }

    //  Get/Sets all fonts
    getFont(_font) {
      self.fontFamily = _font;
      self.setFont($('#video-container'));
      self.setFont($('#widget-overlay'));
      self.setFont($('#tag-overlay'));
    }

    setFont(_div) {
      _div.addClass(self.fontFamily);
    }

    getModuleData = function() {
      var spreadsheet = '';

      // if(self.player.vidId == _vipVid || self.player.vidId == _choiceVid ){
          spreadsheet = 'spreadsheet_link';
      // }
      apiService.getSheetDataCdn(spreadsheet, function (sheetData) {

          //  Separate content
          self.textLabel = _.where(sheetData, {labeltype: 'textlabel'});
          self.sectionContent = _.where(sheetData, {labeltype: 'section'});
          // self.menuSounds = _.where(sheetData, {labeltype: 'overlaysounds'}); // Loads all menu mp3s
          // self.logTracer(self.textLabel);

          //  Images
          self.posterImages = _.where(sheetData, {labeltype: 'poster'});
          self.sectionImages = _.where(sheetData, {labeltype: 'section'});

          //  Preload all images
          self.preloadAllImages(self.posterImages, ['menuimagedesktop1', 'menuimagedesktop2', 'menuimagemobile1', 'menuimagemobile2']);
          self.preloadAllImages(self.sectionImages, ['menuimagedesktop1', 'menuimagedesktop2', 'menuimagemobile1', 'menuimagemobile2', 'overlayimagedesktop', 'overlayimagemobile1', 'overlayimagemobile2']);

          //  Start build
          self.buildPosterFrame();

      }, function () {
          // do nothing
      });
    }


    //////////////////  BRIGHTCOVE UTILITIES  //////////////////

    callFullscreen() {
      // console.log('callFullscreen');
      // brightcovevideocomponent(); // Function from LaPrairie web team

      var target_origin = '/'+window.location.host;
      // console.log(target_origin);
      // console.log(window.parent);

      //  Assigned on the intro play button
      if(!window.wirewax) window.parent.postMessage('brightcovevideocomponent', target_origin);
    }

    hideBCcontrols() {
      $('.vjs-control-bar').addClass('controller-invisible');
    }

    showBCcontrols() {
      $('.vjs-control-bar').removeClass('controller-invisible');
    }

    hideMobileControls() {
      gsap.delayedCall(3, function(){
          $('.video-js').removeClass('vjs-user-active');
          $('.video-js').addClass('vjs-user-inactive');
      });

    }


    //////////////////  UTILITIES  //////////////////
    onResize() {
        self.logTracer('resize');

        // If this is mobile, listen for orientation
        if (!globals.IS_DESKTOP) {
          self.checkWindowMode();
        }

    }

    checkWindowMode() {
      if (window.innerHeight > window.innerWidth) {
          //portrait
          // window.alert('portrait');
          self.togglePortraitWarning(true);
      } else {
          //landscape
          // window.alert('landscape');
          self.togglePortraitWarning(false);
          // self.togglePortraitWarning(true); //TEST
      }
    }

    togglePortraitWarning(_boolean) {

      if(_boolean == true) {
        //portrait
        // window.alert('portrait');

        if(self.overlayImage) self.setupVIPoverlayPortrait(); //Overlay layout
        if(self.menuHeader) self.setupMenuPortrait(); //Overlay layout

      } else {
        //landscape
        // window.alert('landscape');

        if(self.overlayImage) self.setupVIPoverlayLandscape(); //Overlay layout
        if(self.menuHeader) self.setupMenuLandscape(); //Overlay layout

      }

    }

    preloadAllImages(_imgData, _imgArray) {

      for ( let i = 0; i < _imgData.length; i++ ){
        //  Gets all of the _imgData versions
        for ( let j = 0; j < _imgArray.length; j++ ){
          var _newImg = _imgData[i][_imgArray[j]];
          if(_newImg != undefined) {
            //  Preload the images in the _imgArray
            this.toolkit.preloadImage(_newImg);
            // self.logTracer('preloadAllImages '+ _newImg);
          }
        }
      }

    }

    logTracer(_str) {
        //  Use this to toggle all console logs on/off
        if(_debug) console.log(_str);
    }

};
