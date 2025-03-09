# soldierXR

Robot VS Michelle:
Protect Michelle's group (dancer) from the robot invasion!
Shoot bullets by tapping your screen to defeat the enemies.
Will you be able to defeat the boss and become the best player by eliminating the most waves?
You can earn HP by going to the Michelle outside the group but don't forget to protect your base!

Project main objective: GLTF/GLB model instancing & AR game.

Features:

- Interaction
- Animation
- Lights and Shadows
- Controls
- Music/Sound

The game is downloadable on phone!

## Live Demo

Results: https://lbilheran.github.io/soldierXR/

![Alt text](./public/assets/images/soldierXR_game.png?raw=true "Result")

## Phone installation

- Go to https://lbilheran.github.io/soldierXR/ on your phone (Chrome is the best option, maybe it doesn't work on other browsers).
- Click on the three dots and click on "Add to home screen".
- Click "Install" to play offline ! Or, create a shorcut to go to the site faster.

/!\ If you play the game on the website, maybe you will have to delete the cache before install the app.

## Local installation

First, clone this repository locally.
Then, run these commands:

- Install packages:

```bash
npm install
```

- Load the game locally:

```bash
npm run dev
```

- Open the following address on a browser (Firefox for example): http://localhost:5173


To play on your phone, make sure your phone supports AR then :

- Run :
```bash
ngrok http http://localhost:5173
```

- Transform the url given in the terminal in QR Code with a browser extension or in DuckDuckGo with "qr http://my-url.com" research.

- Scan the QR Code with your phone, go to the website and play !

## Sources

- Three JS examples:

  - Robot, animation and GUI: https://threejs.org/examples/#webgl_animation_skinning_morph
  - Michelle and instancing: https://threejs.org/examples/?q=inst#webgpu_skinning_instancing
  - Lights and Shadows: https://threejs.org/examples/?q=light#webgl_lights_hemisphere

- Musique: Age of War (Video Game)
- Robot Death Sound : Lego (Video Game) 
- 1UP Sound : Mario Bros (Nintendo)

## Thanks

I would like to thank my teacher, Fivos Doganis, for this course and this WEB XR project.
Thanks for all the people who created the Three JS examples and models.
