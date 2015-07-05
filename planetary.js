var Planetary = { };

Planetary.PLAYER_SPEED = 0.035;
Planetary.PLAYER_JUMP = 12.5;
Planetary.PLAYER_ANGULAR_ACCELERATION = 0.001;
Planetary.PLANET_GRAVITY = -1;
Planetary.PLAYER_MIN_SPEED = -5;

Planetary.Player = function(game) {
    this.game = game;
    var planetImage = this.game.cache.getImage('planet');
    var spacemanImage = this.game.cache.getImage('spaceman');

    this._angle = 0;
    this._angularVelocity = 0;
    this._platformAngularVelocity = 0;

    this._radius = (planetImage.height / 2) + (spacemanImage.height / 2);
    this._prevRadius = this._radius;
    this._radialVelocity = 0;
    this._landed = false;
    this._falling = false;
    this._direction = 'right';

    this.sprite = this.game.add.sprite(0, 0, 'spaceman');
    this.sprite.anchor.setTo(0.5, 0.5);
    this.sprite.animations.add('left', [4, 5, 6, 7], 10, true);
    this.sprite.animations.add('right', [0, 1, 2, 3], 10, true);

    this._updatePosition();
};

Planetary.Player.prototype = {
    _landedAt: function(height, angularVelocity) {
        this._radius = height;
        this._radialVelocity = 0;
        this._landed = true;
        this._platformAngularVelocity = angularVelocity;
    },
    _updateMovement: function() {
        // Do radial movements and collision first
        this._prevRadius = this._radius;
        this._radialVelocity += Planetary.PLANET_GRAVITY;
        if (this._radialVelocity < Planetary.PLAYER_MIN_SPEED) {
            this._radialVelocity = Planetary.PLAYER_MIN_SPEED;
        }
        this._radius += this._radialVelocity;
        var halfHeight = this.sprite.height / 2;
        var bottom = this._radius - halfHeight;
        var prevBottom = this._prevRadius - halfHeight;
        this._landed = false;
        // Check for collision with the planet
        if (bottom <= this.game.planet.radius) {
            this._landedAt(this.game.planet.radius + halfHeight,
                           this.game.planet.angularVelocity);
        }
        // Check for collision with the platforms
        if (!this._falling) {
            for (var i = 0; i < this.game.platforms.platformArray.length; i++) {
                var platform = this.game.platforms.platformArray[i];
                var halfPlayerAngle = this.sprite.width / (2 * this._radius);
                var platformStartAngle = platform.angle - halfPlayerAngle;
                var platformEndAngle = platform.angle + platform.width + halfPlayerAngle;
                if ((platformStartAngle <= this._angle - (Math.PI * 2) &&
                     this._angle - (Math.PI * 2) <= platformEndAngle) ||
                    (platformStartAngle <= this._angle &&
                     this._angle <= platformEndAngle) ||
                    (platformStartAngle <= this._angle + (Math.PI * 2) &&
                     this._angle + (Math.PI * 2) <= platformEndAngle)) {
                    if (platform.height <= prevBottom &&
                        bottom < platform.height) {
                        this._landedAt(platform.height + halfHeight,
                                       platform.angularVelocity);
                    }
                }
            }
        }
        // Handle rotational movements. We could handle collisions with
        // walls at this point
        this._angle += this._angularVelocity * this.game.planet.radius / this._radius;
        this._angle += this._platformAngularVelocity;
        this._angle = Phaser.Math.normalizeAngle(this._angle);
    },
    _updatePosition: function() {
        // Translate polar coordinates to Cartesian coordinates
        this.sprite.x = (this.game.world.width / 2) +
                        (this._radius * Math.sin(this._angle));
        this.sprite.y = (this.game.world.height / 2) +
                        (this._radius * -Math.cos(this._angle));
        this.sprite.rotation = this._angle;
    },
    update: function() {
        this._updateMovement();
        this._updatePosition();
    },
    moveLeft: function() {
        this.sprite.animations.play('left');
        this._direction = 'left';
        this._angularVelocity = -Planetary.PLAYER_SPEED;
        // Allow the player to shed right inertia if they are holding left
        if (0 < this._platformAngularVelocity) {
            this._platformAngularVelocity -= Planetary.PLAYER_ANGULAR_ACCELERATION;
            if (this._platformAngularVelocity < 0) {
                this._platformAngularVelocity = 0;
            }
        }
    },
    moveRight: function() {
        this.sprite.animations.play('right');
        this._direction = 'right';
        this._angularVelocity = Planetary.PLAYER_SPEED;
        // Allow the player to shed left inertia if they are holding right
        if (this._platformAngularVelocity < 0) {
            this._platformAngularVelocity += Planetary.PLAYER_ANGULAR_ACCELERATION;
            if (0 < this._platformAngularVelocity) {
                this._platformAngularVelocity = 0;
            }
        }
    },
    moveClear: function() {
        this.sprite.animations.stop();
        if (this._direction === 'left') {
            this.sprite.frame = 4;
        } else if (this._direction === 'right') {
            this.sprite.frame = 0;
        }
        this._angularVelocity = 0;
    },
    jump: function() {
        if (this._landed) {
            this._radialVelocity = Planetary.PLAYER_JUMP;
        }
    },
    fallStart: function() {
        if (this._landed) {
            this._radius--;
            this._prevRadius = this._radius;
        }
        this._falling = true;
    },
    fallStop: function() {
        this._falling = false;
    }
};

Planetary.Planet = function(game, angularVelocity) {
    if (angularVelocity === undefined) {
        angularVelocity = 0;
    }

    this.game = game;
    this.sprite = this.game.add.sprite(this.game.world.width / 2,
                                       this.game.world.height / 2,
                                       'planet');
    this.sprite.anchor.setTo(0.5, 0.5);
    this.radius = this.sprite.width / 2;
    this._angle = 0;
    this.angularVelocity = angularVelocity;
};

Planetary.Planet.prototype = {
    update: function() {
        this._angle += this.angularVelocity;
        this.sprite.rotation = this._angle;
        this.sprite.x = this.game.world.width / 2;
        this.sprite.y = this.game.world.height / 2;
    }
};

Planetary.Platform = function(game, angle, width,
                              height, thickness, angularVelocity) {
    this.game = game;
    this.angle = angle;
    this.width = width;
    this.height = height;
    this.thickness = thickness;
    this.angularVelocity = angularVelocity;
    this.graphics = this.game.add.graphics(0, 0, this.game.platforms.group);
    // Draw fill
    this.graphics.lineStyle(this.thickness, 0x333333);
    this.graphics.arc(0, 0, this.height - (this.thickness / 2),
                      -Math.PI / 2,
                      this.width - (Math.PI / 2));
    // Draw top outline
    this.graphics.lineStyle(2, 0x666666);
    this.graphics.moveTo(this.height * 0,
                         this.height * -1);
    this.graphics.lineTo((this.height - this.thickness) * 0,
                         (this.height - this.thickness) * -1);
    this.graphics.moveTo(this.height * Math.sin(this.width),
                         this.height * -Math.cos(this.width));
    this.graphics.lineTo((this.height - this.thickness) * Math.sin(this.width),
                         (this.height - this.thickness) * -Math.cos(this.width));
    this.graphics.arc(0, 0, this.height,
                      -Math.PI / 2,
                      this.width - (Math.PI / 2));
    // Draw bottom outline
    this.graphics.lineColor = 0x222222;
    this.graphics.arc(0, 0, this.height - this.thickness,
                      -Math.PI / 2,
                      this.width - (Math.PI / 2));
};

Planetary.Platform.prototype = {
    update: function() {
        this.angle += this.angularVelocity;
        this.angle = Phaser.Math.normalizeAngle(this.angle);
        this.graphics.rotation = this.angle;
    }
};

Planetary.PlatformCluster = function(game) {
    this.game = game;
    this.platformArray = [];
    this.group = this.game.add.group();
};

Planetary.PlatformCluster.prototype = {
    add: function(angle, width, height, thickness, angularVelocity) {
        if (thickness === undefined) {
            thickness = 10;
        }
        if (angularVelocity === undefined) {
            angularVelocity = 0;
        }
        var platform = new Planetary.Platform(this.game,
                                              angle, width,
                                              height, thickness,
                                              angularVelocity);
        this.platformArray.push(platform);
    },
    update: function() {
        for (var i = 0; i < this.platformArray.length; i++) {
            this.platformArray[i].update();
        }
    }
};

Planetary.StarGroup = function(game, numStars) {
    this.game = game;
    this.group = this.game.add.group();
    this.starDensity = numStars / (this.game.world.width * this.game.world.height);
    this.reset();
};

Planetary.StarGroup.prototype = {
    reset: function() {
        this.group.removeAll();
        var numStars = this.starDensity * this.game.world.width * this.game.world.height;
        for (var i = 0; i < numStars; i++) {
            var star = this.group.create(this.game.rnd.between(0, this.game.world.width),
                                         this.game.rnd.between(0, this.game.world.height),
                                         'star');
            var size = Math.pow(this.game.rnd.frac(), 2) / 2;
            star.scale.setTo(size, size);
        }
    }
};

Planetary.City = function(game, angle) {
    this.game = game;
    this.angle = angle;
    var cityImage = this.game.cache.getImage('city');
    var planetImage = this.game.cache.getImage('planet');
    var radius = (planetImage.height / 2) + (cityImage.height / 2) - 2;
    var posX = radius * Math.sin(this.angle);
    var posY = radius * -Math.cos(this.angle);
    this.sprite = this.game.cityGroup.create(posX, posY, 'city');
    this.sprite.anchor.setTo(0.5, 0.5);
    this.sprite.rotation = this.angle;
};

Planetary.Input = function(game) {
    this.game = game;
    this.cursors = this.game.input.keyboard.createCursorKeys();
    this.cursorUpArrowPrev = false;
};

Planetary.Input.prototype = {
    update: function() {
        // Check for left and right movement
        if (this.cursors.left.isDown) {
            this.game.player.moveLeft();
        } else if (this.cursors.right.isDown) {
            this.game.player.moveRight();
        } else {
            this.game.player.moveClear();
        }
        // Check for jump
        if (this.cursors.up.isDown && !this.cursorUpArrowPrev) {
            this.game.player.jump();
        }
        this.cursorUpArrowPrev = this.cursors.up.isDown;
        // Check for fall
        if (this.cursors.down.isDown) {
            this.game.player.fallStart();
        } else {
            this.game.player.fallStop();
        }
    }
};

Planetary.Game = function(width, height, container) {
    if (width === undefined) {
        width = 800;
    }
    if (height === undefined) {
        height = 600;
    }
    if (container === undefined) {
        container = '';
    }
    this.game = new Phaser.Game(width, height, Phaser.AUTO, container);
    this.game.state.add('Planetary', this, true);
};

Planetary.Game.prototype = {
    preload: function() {
        this.load.image('planet', 'assets/planet.png');
        this.load.spritesheet('spaceman', 'assets/spaceman.png', 18, 32);
        this.load.image('star', 'assets/star.png');
        this.load.spritesheet('city', 'assets/city.png', 56, 50);
        this.load.image('pistol', 'assets/pistol.png');
        this.load.image('rifle', 'assets/rifle.png');
        this.load.image('bullet', 'assets/bullet.png');
        this.load.image('flash', 'assets/flash.png');
    },

    create: function() {
        this.stars = new Planetary.StarGroup(this, 250);
        this.cityGroup = this.add.group();
        this.cities = [];
        for (var i = 0; i < 3; i++) {
            var cityAngle = Phaser.Math.normalizeAngle(2 * Math.PI * (i / 3) + 0.5);
            this.cities.push(new Planetary.City(this, cityAngle));
        }
        this.planet = new Planetary.Planet(this);
        this.player = new Planetary.Player(this);
        this.inputHandler = new Planetary.Input(this);
        this.platforms = new Planetary.PlatformCluster(this);
        this.platforms.add(Math.PI / 6, Math.PI / 3, 185, 10, 0.01);
        this.platforms.add(Math.PI / 3, Math.PI / 3, 215, 10, 0.005);
        this.platforms.add(Math.PI / 2, Math.PI / 3, 245, 10, -0.01);

        this.planet.sprite.addChild(this.cityGroup);
        this.planet.sprite.addChild(this.platforms.group);

        this.game.scale.fullScreenScaleMode = Phaser.ScaleManager.RESIZE;
        this.game.scale.onSizeChange.add(function() { this.stars.reset(); }, this);
        this.game.input.onDown.add(function() { this.scale.startFullScreen(false); }, this);
    },

    update: function() {
        this.inputHandler.update();
        this.player.update();
        this.planet.update();
        this.platforms.update();
        this.world.bringToTop(this.player.sprite);
    }
};
