var Planetary = { };

Planetary.PLAYER_SPEED = 0.035;
Planetary.PLAYER_JUMP = 12.5;
Planetary.PLAYER_ANGULAR_ACCELERATION = 0.001;
Planetary.PLANET_GRAVITY = -1;
Planetary.PLAYER_MIN_SPEED = -5;
Planetary.PISTOL_DAMAGE = 5;
Planetary.RIFLE_DAMAGE = 2;
Planetary.ROBOT_SPEED = 0.0025;
Planetary.ROBOT_HEALTH = 20;
Planetary.ROBOT_HEALTH_INCREASE = 0.5;
Planetary.ROBOT_POINTS = 150;
Planetary.ROBOT_DAMAGE = 50;
Planetary.SPACESHIP_HEALTH = 75;
Planetary.SPACESHIP_POINTS = 750;
Planetary.CITY_HEALTH = 1000;

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
    this.direction = 'right';

    this.sprite = this.game.add.sprite(0, 0, 'spaceman');
    this.sprite.anchor.setTo(0.5, 0.5);
    this.sprite.animations.add('left', [4, 5, 6, 7], 10, true);
    this.sprite.animations.add('right', [0, 1, 2, 3], 10, true);

    this._weapons = [
        new Planetary.Pistol(this.game, this),
        new Planetary.Rifle(this.game, this)
    ];
    this._currentWeaponIndex = 0;
    this.changeWeaponTo(this._currentWeaponIndex);
    this.strafing = false;

    this.score = 0;

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
        this.sprite.x = this._radius * Math.sin(this._angle);
        this.sprite.y = this._radius * -Math.cos(this._angle);
        this.sprite.rotation = this._angle;
    },
    update: function() {
        this._updateMovement();
        this._updatePosition();
        this._weapons[this._currentWeaponIndex].update(this.direction);
    },
    moveLeft: function() {
        if (!this.strafing) {
            this.direction = 'left';
        }
        if (this.direction === 'left') {
            this.sprite.animations.play('left');
        } else if (this.direction === 'right') {
            this.sprite.animations.play('right');
        }
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
        if (!this.strafing) {
            this.direction = 'right';
        }
        if (this.direction === 'left') {
            this.sprite.animations.play('left');
        } else if (this.direction === 'right') {
            this.sprite.animations.play('right');
        }
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
        if (this.direction === 'left') {
            this.sprite.frame = 4;
        } else if (this.direction === 'right') {
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
    },
    shoot: function() {
        this._weapons[this._currentWeaponIndex].shoot();
    },
    changeWeaponTo: function(index) {
        this._currentWeaponIndex = index % this._weapons.length;
        for (var i = 0; i < this._weapons.length; i++) {
            var weapon = this._weapons[i];
            if (i === this._currentWeaponIndex) {
                weapon.sprite.visible = true;
                this.sprite.addChild(weapon.sprite);
            } else {
                weapon.sprite.visible = false;
                this.sprite.removeChild(weapon.sprite);
            }
        }
    },
    changeWeapon: function() {
        this.changeWeaponTo(this._currentWeaponIndex + 1);
    }
};

Planetary.Weapon = function(game, player) {
    this.game = game;
    this.player = player;
};

Planetary.Weapon.prototype = {
    update: function(direction) {
        if (direction === 'left') {
            this.sprite.scale.setTo(-1, 1);
        } else if (direction === 'right') {
            this.sprite.scale.setTo(1, 1);
        }
        if (this.cooldown > 0) {
            this.cooldown--;
        }
        this.sprite.x = this.offset.x;
        this.sprite.y = this.offset.y;
        if ([ 1, 3, 5, 7 ].indexOf(this.player.sprite.frame) !== -1) {
            this.sprite.y += 2;
        }
    },
    shoot: function() {
        if (this.cooldown > 0) {
            return;
        }
        this.addBullet();
        this.sprite.animations.play('shoot');
        this.cooldown = this.cooldownMax;
    },
    addBullet: function() { }
};

Planetary.Pistol = function(game, player) {
    this.game = game;
    this.player = player;
    this.offset = new Phaser.Point(-2, -2);
    this.sprite = this.game.add.sprite(this.offset.x, this.offset.y, 'pistol');
    this.sprite.animations.add('shoot', [1, 0], 15, false);
    this.cooldownMax = 15;
    this.cooldown = 0;
    this.damage = Planetary.PISTOL_DAMAGE;
    this.bulletSpeed = 10;
};
Planetary.Pistol.prototype = Object.create(Planetary.Weapon.prototype);
Planetary.Pistol.prototype.addBullet = function() {
    this.game.bullets.add(this.player,
                          this.damage,
                          this.player.sprite.position,
                          this.player.sprite.rotation,
                          this.bulletSpeed,
                          this.player.direction);
};

Planetary.Rifle = function(game, player) {
    this.game = game;
    this.player = player;
    this.offset = new Phaser.Point(-2, -2);
    this.sprite = this.game.add.sprite(this.offset.x, this.offset.y, 'rifle');
    this.sprite.animations.add('shoot', [1, 0], 30, false);
    this.cooldownMax = 5;
    this.cooldown = 0;
    this.damage = Planetary.RIFLE_DAMAGE;
    this.bulletSpeed = 10;
};
Planetary.Rifle.prototype = Object.create(Planetary.Weapon.prototype);
Planetary.Rifle.prototype.addBullet = function() {
    var angle = this.player.sprite.rotation + ((this.game.rnd.frac() - 0.5) * 0.1);
    this.game.bullets.add(this.player,
                          this.damage,
                          this.player.sprite.position,
                          angle,
                          this.bulletSpeed,
                          this.player.direction);
};

Planetary.BulletCluster = function(game) {
    this.game = game;
    this.group = this.game.add.group()
    this.bulletArray = [];
};

Planetary.BulletCluster.prototype = {
    add: function(owner, damage, position, angle, speed, direction) {
        var bullet = new Planetary.Bullet(this.game, owner, damage, position, angle, speed, direction);
        this.group.add(bullet.sprite);
        this.bulletArray.push(bullet);
    },
    update: function() {
        for (var i = this.bulletArray.length - 1; i >= 0; i--) {
            this.bulletArray[i].update();
            if (!this.bulletArray[i].alive) {
                this.bulletArray.splice(i, 1);
            }
        }
    }
};

Planetary.Bullet = function(game, owner, damage, position, angle, speed, direction) {
    if (direction === 'left') {
        angle += Math.PI;
    }
    this.game = game;
    this.owner = owner;
    this.damage = damage;
    this.sprite = this.game.add.sprite(position.x, position.y, 'bullet');
    this.sprite.x = position.x;
    this.sprite.y = position.y;
    this.sprite.rotation = angle;
    this.velocity = new Phaser.Point(
        speed * Math.cos(angle),
        speed * Math.sin(angle)
    );
    this._timeToLive = 150;
    this.alive = true;
};

Planetary.Bullet.prototype = {
    collided: function(angle, radius, width, height) {
        var halfHeight = height / 2;
        var halfAngle = width / (2 * radius);
        var minRadius = radius - halfHeight;
        var maxRadius = radius + halfHeight
        var minAngle = angle - halfAngle;
        var maxAngle = angle + halfAngle;
        var bulletRadius = new Phaser.Point(this.sprite.x, this.sprite.y).getMagnitude();
        var bulletAngle = Math.atan2(this.sprite.x, -this.sprite.y);
        bulletAngle = Phaser.Math.normalizeAngle(bulletAngle);
        if (bulletRadius >= minRadius && bulletRadius <= maxRadius) {
            var bulletAngle2 = bulletAngle - (2 * Math.PI);
            var bulletAngle3 = bulletAngle + (2 * Math.PI);
            if ((bulletAngle >= minAngle && bulletAngle <= maxAngle) ||
                (bulletAngle2 >= minAngle && bulletAngle2 <= maxAngle) ||
                (bulletAngle3 >= minAngle && bulletAngle3 <= maxAngle)) {
                return true;
            }
        }
        return false;
    },
    update: function() {
        // Update position
        this.sprite.x += this.velocity.x;
        this.sprite.y += this.velocity.y;

        // Check for bullet-robot collision
        for (var i = 0; i < this.game.robots.robotArray.length; i++) {
            var robot = this.game.robots.robotArray[i];
            if (this.collided(robot.angle, robot.radius,
                              Math.abs(robot.sprite.width), robot.sprite.height)) {
                robot.damage(this);
                this.sprite.destroy();
                this.alive = false;
                return;
            }
        }

        // Check for bullet-spaceship collision
        for (var i = 0; i < this.game.spaceships.spaceshipArray.length; i++) {
            var spaceship = this.game.spaceships.spaceshipArray[i];
            if (this.collided(spaceship.angle, spaceship.radius,
                              spaceship.sprite.width, spaceship.sprite.height)) {
                spaceship.damage(this);
                this.sprite.destroy();
                this.alive = false;
                return;
            }
        }

        // Kill if no lifespan left
        this._timeToLive--;
        if (this._timeToLive === 0) {
            this.sprite.destroy();
            this.alive = false;
            return;
        }
    }
};

Planetary.SpaceshipCluster = function(game) {
    this.game = game;
    this.group = this.game.add.group();
    this.spaceshipArray = [];

    this.spawnCooldownMax = 500;
    this.spawnCooldown = 0;
};

Planetary.SpaceshipCluster.prototype = {
    add: function(angle) {
        var spaceship = new Planetary.Spaceship(this.game, angle);
        this.group.add(spaceship.sprite);
        this.spaceshipArray.push(spaceship);
    },
    update: function() {
        if (this.spawnCooldown > 0) {
            this.spawnCooldown--;
        } else {
            this.spawnCooldown = this.spawnCooldownMax;
            this.add(Math.PI * 2 * this.game.rnd.frac());
        }
        for (var i = this.spaceshipArray.length - 1; i >= 0; i--) {
            if (!this.spaceshipArray[i].alive) {
                this.spaceshipArray.splice(i, 1);
            } else {
                this.spaceshipArray[i].update();
            }
        }
    }
};

Planetary.Spaceship = function(game, angle) {
    this.game = game;
    this.angle = angle;
    this.sprite = this.game.add.sprite(0, 0, 'spaceship');
    this.sprite.anchor.setTo(0.5, 0.5);
    this.sprite.rotation = this.angle;
    this.sprite.animations.add('spin', [0, 1, 2, 3, 4], 30, true);
    this.sprite.animations.play('spin');

    this.launching = false;
    this.launchCooldownMax = 120;
    this.launchCooldown = this.launchCooldownMax;
    this.launchNum = this.game.rnd.between(1, 5);

    this.health = Planetary.SPACESHIP_HEALTH;
    this.alive = true;

    // Find the starting radius, far enough away that the
    // spaceship is offscreen from any angle
    this.startRadius = new Phaser.Point(
        screen.width + this.sprite.width,
        screen.height + this.sprite.height
    ).getMagnitude() / 2;
    this.radius = this.startRadius;
    // Find the distance at which we should hover
    // and shoot/launch robots
    this.stopRadius = this.game.planet.radius;
    for (var i = 0; i < this.game.platforms.platformArray.length; i++) {
        var platform = this.game.platforms.platformArray[i];
        if (platform.height > this.stopRadius) {
            this.stopRadius = platform.height;
        }
    }
    this.stopRadius += this.sprite.height / 2;
    this.stopRadius += 20;
    // Use tweening to smoothly get the ship within robot
    // launching distance
    var tween = this.game.add.tween(this).to({ radius: this.stopRadius },
                                             2500,
                                             Phaser.Easing.Cubic.InOut,
                                             true);
    tween.onComplete.add(function() { this.launching = true; }, this);
};

Planetary.Spaceship.prototype = {
    damage: function(bullet) {
        this.health -= bullet.damage;
        this.sprite.alpha = ((this.health / Planetary.SPACESHIP_HEALTH) * 0.75) + 0.25;
        if (this.health <= 0) {
            this.game.player.score += Planetary.SPACESHIP_POINTS;
            this.alive = false;
            this.sprite.destroy();
        }
    },
    launchRobot: function() {
        this.game.robots.add(this.angle, this.radius);
    },
    update: function() {
        this.sprite.x = this.radius * Math.sin(this.angle);
        this.sprite.y = this.radius * -Math.cos(this.angle);

        if (this.launching) {
            if (this.launchCooldown > 0) {
                this.launchCooldown--;
            } else {
                this.launchCooldown = this.launchCooldownMax;
                this.launchNum--;
                this.launchRobot();

                if (this.launchNum === 0) {
                    this.launching = false;
                    // Use tweening to disappear
                    var tween = this.game.add.tween(this).to({ radius: this.startRadius },
                                                             2500,
                                                             Phaser.Easing.Cubic.InOut,
                                                             true);
                    tween.onComplete.add(this.remove, this);
                }
            }
        }
    },
    remove: function() {
        this.game.spaceships.group.remove(this.sprite);
        this.sprite.destroy();
        for (var i = 0; i < this.game.spaceships.spaceshipArray.length; i++) {
            if (this === this.game.spaceships.spaceshipArray[i]) {
                this.game.spaceships.spaceshipArray.splice(i, 1);
                break;
            }
        }
    }
};

Planetary.RobotCluster = function(game) {
    this.game = game;
    this.group = this.game.add.group();
    this.robotArray = [];
    this.startingHealth = Planetary.ROBOT_HEALTH;
};

Planetary.RobotCluster.prototype = {
    add: function(angle, radius) {
        var robot = new Planetary.Robot(this.game, angle, radius, this.startingHealth);
        this.startingHealth += Planetary.ROBOT_HEALTH_INCREASE;
        this.group.add(robot.sprite);
        this.robotArray.push(robot);
    },
    update: function() {
        for (var i = this.robotArray.length - 1; i >= 0; i--) {
            if (!this.robotArray[i].alive) {
                this.robotArray.splice(i, 1);
            } else {
                this.robotArray[i].update();
            }
        }
    }
};

Planetary.Robot = function(game, angle, radius, startingHealth) {
    this.game = game;
    this.angle = angle;
    this.angularVelocity = 0;
    this._platformAngularVelocity = 0;
    this.radius = radius;
    this.radialVelocity = 0;
    this.sprite = this.game.add.sprite(this.radius * Math.sin(this.angle),
                                       this.radius * -Math.cos(this.angle),
                                       'robot');
    this.sprite.anchor.setTo(0.5, 0.5);
    this.sprite.rotation = this.angle;
    this.sprite.animations.add('walk', [0, 1, 2, 3], 2, true);

    this.arm = this.game.add.sprite(-8, -30, 'robotarm');
    this.arm.animations.add('attack', [0, 1, 2, 3], 2, true);
    this.sprite.addChild(this.arm);

    this.attacking = null;
    if (startingHealth === undefined) {
        startingHealth = Planetary.ROBOT_HEALTH;
    }
    this.startingHealth = startingHealth;
    this.health = startingHealth;
    this.alive = true;

    if (this.game.rnd.frac() < 0.5) {
        this.walkLeft();
    } else {
        this.walkRight();
    }
};

Planetary.Robot.prototype = {
    damage: function(bullet) {
        this.health -= bullet.damage;
        this.sprite.alpha = ((this.health / this.startingHealth) * 0.75) + 0.25;
        if (this.health <= 0) {
            // Scale the points for this robot so that as they get more starting health
            // you get more points.
            var points = Math.floor(Planetary.ROBOT_POINTS * (this.startingHealth / Planetary.ROBOT_HEALTH));
            this.game.player.score += points;
            this.sprite.destroy();
            this.alive = false;
        }
    },
    update: function() {
        var prevRadius = this.radius;
        var minRadius = this.game.planet.radius + (this.sprite.height / 2);
        this.radialVelocity += Planetary.PLANET_GRAVITY;
        if (this.radialVelocity < Planetary.PLAYER_MIN_SPEED) {
            this.radialVelocity = Planetary.PLAYER_MIN_SPEED;
        }
        this.radius += this.radialVelocity;
        this.angle += this._platformAngularVelocity;
        this.angle += this.angularVelocity * (minRadius / this.radius);
        this.angle = this.game.math.normalizeAngle(this.angle);
        this._platformAngularVelocity = 0;

        // Check for collision with the planet
        if (this.radius < minRadius) {
            this.radius = minRadius;
            this.radialVelocity = 0;
            this._platformAngularVelocity = this.game.planet.angularVelocity;
        }

        // Check for robot collision with platforms
        for (var i = 0; i < this.game.platforms.platformArray.length; i++) {
            var platform = this.game.platforms.platformArray[i];
            var halfRobotAngle = Math.abs(this.sprite.width) / (2 * this.radius);
            var platformStartAngle = platform.angle - halfRobotAngle;
            var platformEndAngle = platform.angle + platform.width + halfRobotAngle;
            if ((platformStartAngle <= this.angle - (Math.PI * 2) &&
                 this.angle - (Math.PI * 2) <= platformEndAngle) ||
                (platformStartAngle <= this.angle &&
                 this.angle <= platformEndAngle) ||
                (platformStartAngle <= this.angle + (Math.PI * 2) &&
                 this.angle + (Math.PI * 2) <= platformEndAngle)) {
                var halfHeight = this.sprite.height / 2;
                var bottom = this.radius - halfHeight;
                var prevBottom = prevRadius - halfHeight;
                if (platform.height <= prevBottom &&
                    bottom < platform.height) {
                    this.radius = platform.height + halfHeight;
                    this.radialVelocity = 0;
                    this._platformAngularVelocity = platform.angularVelocity;
                }
            }
        }

        // Check if we should damage a city that we're attacking
        if (this.attacking) {
            if (this.attacking.alive) {
                // Only damage on attack frame
                var attackFrame = 3;
                if (this.arm.frame === attackFrame &&
                    this._prevArmFrame !== attackFrame) {
                    this.attacking.damage(Planetary.ROBOT_DAMAGE);
                }
                this._prevArmFrame = this.arm.frame;
            } else {
                // City is dead, keep walking
                this.stop();
                if (this.direction === 'left') {
                    this.walkLeft();
                } else if (this.direction === 'right') {
                    this.walkRight();
                }
            }
        } else if (this.radius === minRadius) {
            // Check if we are on top of a city and we should attack it
            for (var i = 0; i < this.game.cities.cityArray.length; i++) {
                var city = this.game.cities.cityArray[i];
                var angularDistance = Math.PI - Math.abs(Math.abs(city.angle - this.angle) - Math.PI);
                var halfCityAngularWidth = city.sprite.width / (2 * this.game.planet.radius);
                if (angularDistance < halfCityAngularWidth) {
                    this.stop();
                    this.attack(city);
                }
            }
        }

        // Set positions
        this.sprite.x = this.radius * Math.sin(this.angle);
        this.sprite.y = this.radius * -Math.cos(this.angle);
        this.sprite.rotation = this.angle;

        // Update arm offset
        switch (this.sprite.frame) {
        case 0:
            this.arm.x = -8;
            this.arm.y = -30;
            break;
        case 1:
            this.arm.x = -7;
            this.arm.y = -32;
            break;
        case 2:
            this.arm.x = -6;
            this.arm.y = -29;
            break;
        case 3:
            this.arm.x = -7;
            this.arm.y = -33;
        }
    },
    walkLeft: function() {
        this.direction = 'left';
        this.sprite.animations.play('walk');
        this.sprite.scale.setTo(-1, 1);
        this.angularVelocity = -Planetary.ROBOT_SPEED;
    },
    walkRight: function() {
        this.direction = 'right';
        this.sprite.animations.play('walk');
        this.sprite.scale.setTo(1, 1);
        this.angularVelocity = Planetary.ROBOT_SPEED;
    },
    stop: function() {
        this.attacking = null;
        this.sprite.animations.stop();
        this.arm.animations.stop();
        this.sprite.frame = this.arm.frame = 0;
        this.angularVelocity = 0;
    },
    attack: function(city) {
        this.attacking = city;
        this.arm.animations.play('attack');
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

Planetary.StarGroup = function(game, starDensity) {
    this.game = game;
    this.group = this.game.add.group();
    this.starDensity = starDensity;
    var numStars = this.starDensity * screen.width * screen.height;
    var halfWidth = screen.width / 2;
    var halfHeight = screen.height / 2;
    for (var i = 0; i < numStars; i++) {
        var star = this.group.create(this.game.rnd.between(-halfWidth, halfWidth),
                                     this.game.rnd.between(-halfHeight, halfHeight),
                                     'star');
        var size = Math.pow(this.game.rnd.frac(), 2) / 2;
        star.scale.setTo(size, size);
    }
};

Planetary.StarGroup.prototype = {
    update: function() {
        this.group.x = this.game.planet.sprite.x;
        this.group.y = this.game.planet.sprite.y;
    }
};

Planetary.CityCluster = function(game) {
    this.game = game;
    this.group = this.game.add.group();
    this.cityArray = [];
};

Planetary.CityCluster.prototype = {
    add: function(angle) {
        var city = new Planetary.City(this.game, angle);
        this.group.add(city.sprite);
        this.cityArray.push(city);
    },
    update: function() {
        for (var i = this.cityArray.length - 1; i >= 0; i--) {
            if (!this.cityArray[i].alive) {
                this.cityArray.splice(i, 1);
            }
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
    this.sprite = this.game.add.sprite(posX, posY, 'city');
    this.sprite.anchor.setTo(0.5, 0.5);
    this.sprite.rotation = this.angle;
    this.sprite.animations.add('shielded', [0], 1, true);
    this.sprite.animations.add('cracked', [1], 1, true);
    this.sprite.animations.add('broken', [2], 1, true);
    this.sprite.animations.add('smoking', [3, 4], 3, true);
    this.sprite.animations.add('flaming', [5, 6], 5, true);

    this.sprite.animations.play('shielded');
    this.health = Planetary.CITY_HEALTH;
    this.alive = true;
};

Planetary.City.prototype = {
    damage: function(amount) {
        this.health -= amount;
        var percentHealth = this.health / Planetary.CITY_HEALTH;
        if (percentHealth > 0.8) {
            this.sprite.animations.play('shielded');
        } else if (percentHealth > 0.6) {
            this.sprite.animations.play('cracked');
        } else if (percentHealth > 0.4) {
            this.sprite.animations.play('broken');
        } else if (percentHealth > 0.2) {
            this.sprite.animations.play('smoking');
        } else if (percentHealth > 0) {
            this.sprite.animations.play('flaming');
        } else {
            this.sprite.destroy();
            this.alive = false;
        }
    }
};

Planetary.Input = function(game) {
    this.game = game;
    this.cursors = this.game.input.keyboard.createCursorKeys();
    this.cursorUpArrowPrev = false;
    this.spacebar = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    this.spacebarDownPrev = false;
    this.strafeKey = this.game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);
    this.xKey = this.game.input.keyboard.addKey(Phaser.Keyboard.X);
    this.xKeyDownPrev = false;
};

Planetary.Input.prototype = {
    update: function() {
        // If game over, only check for space to restart
        if (this.game.gameOver) {
            if (this.spacebar.isDown && !this.spacebarDownPrev) {
                // Restart the current game if they hit space
                this.game.state.start(this.game.state.current);
            }
        } else {
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
            // Check for fall
            if (this.cursors.down.isDown) {
                this.game.player.fallStart();
            } else {
                this.game.player.fallStop();
            }
            // Check for shoot
            if (this.spacebar.isDown) {
                this.game.player.shoot();
            }
            // Check for swap weapon
            if (this.xKey.isDown && !this.xKeyDownPrev) {
                this.game.player.changeWeapon();
            }
            // Check for strafing
            this.game.player.strafing = this.strafeKey.isDown;
        }
        this.cursorUpArrowPrev = this.cursors.up.isDown;
        this.spacebarDownPrev = this.spacebar.isDown;
        this.xKeyDownPrev = this.xKey.isDown;
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
        this.gameOver = false;

        this.load.image('planet', 'assets/planet.png');
        this.load.image('star', 'assets/star.png');
        this.load.image('bullet', 'assets/bullet.png');
        this.load.spritesheet('pistol', 'assets/pistol.png', 10, 6);
        this.load.spritesheet('spaceman', 'assets/spaceman.png', 18, 32);
        this.load.spritesheet('city', 'assets/city.png', 56, 50);
        this.load.spritesheet('rifle', 'assets/rifle.png', 19, 7);
        this.load.spritesheet('spaceship', 'assets/spaceship.png', 100, 50);
        this.load.spritesheet('robot', 'assets/robot.png', 30, 43);
        this.load.spritesheet('robotarm', 'assets/robotarm.png', 41, 45);
    },

    create: function() {
        this.stars = new Planetary.StarGroup(this, 250 / (600 * 800));
        this.cities = new Planetary.CityCluster(this);
        for (var i = 0; i < 3; i++) {
            var cityAngle = Phaser.Math.normalizeAngle(2 * Math.PI * (i / 3) + 0.5);
            this.cities.add(cityAngle);
        }
        this.planet = new Planetary.Planet(this);
        this.player = new Planetary.Player(this);
        this.inputHandler = new Planetary.Input(this);
        this.platforms = new Planetary.PlatformCluster(this);
        this.platforms.add(Math.PI / 6, Math.PI / 3, 185, 10, 0.01);
        this.platforms.add(Math.PI / 3, Math.PI / 3, 215, 10, 0.005);
        this.platforms.add(Math.PI / 2, Math.PI / 3, 245, 10, -0.01);
        this.bullets = new Planetary.BulletCluster(this);
        this.robots = new Planetary.RobotCluster(this);
        this.spaceships = new Planetary.SpaceshipCluster(this);

        this.score = this.game.add.text(20, 20, 'Score: 0',
                                        {
                                            font: 'Arial',
                                            fontSize: 32,
                                            fontWeight: 'bold',
                                            fill: '#fff',
                                            stroke: '#000',
                                            strokeThickness: 2
                                        });

        this.planet.sprite.addChild(this.cities.group);
        this.planet.sprite.addChild(this.platforms.group);
        this.planet.sprite.addChild(this.bullets.group);
        this.planet.sprite.addChild(this.robots.group);
        this.planet.sprite.addChild(this.spaceships.group);
        this.planet.sprite.addChild(this.player.sprite);

        this.game.scale.fullScreenScaleMode = Phaser.ScaleManager.RESIZE;
        this.game.input.onDown.add(function() { this.scale.startFullScreen(false); }, this);
    },

    update: function() {
        this.inputHandler.update();
        this.player.update();
        this.planet.update();
        this.platforms.update();
        this.bullets.update();
        this.stars.update();
        this.robots.update();
        this.spaceships.update();
        this.cities.update();
        this.world.bringToTop(this.player.sprite);

        // Check for endgame condition
        if (!this.gameOver) {
            if (this.cities.cityArray.length === 0) {
                var fontOptions = {
                    fill: '#fff',
                    stroke: '#000',
                    strokeThickness: 2,
                    font: 'Arial',
                    fontSize: 50,
                    fontWeight: 'bold'
                };
                this.gameOver = true;
                this.player.sprite.destroy();
                var gameOverText = this.game.add.text(0,
                                                      -(this.planet.radius + 50),
                                                      'Game Over!',
                                                      fontOptions);
                var continueText = this.game.add.text(0,
                                                      this.planet.radius + 50,
                                                      'Press SPACE to Continue',
                                                      fontOptions);
                gameOverText.anchor.setTo(0.5, 0.5);
                continueText.anchor.setTo(0.5, 0.5);
                this.planet.sprite.addChild(gameOverText);
                this.planet.sprite.addChild(continueText);
            } else {
                this.score.text = 'Score: ' + this.player.score;
            }
        }
    }
};
