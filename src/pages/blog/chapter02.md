---
title: 'Análizando el firmware'
pubDate: 2024-04-22
description: 'Estoy sin ideas de que no poner aqui. Estaría bien ordernarlos cronologicamente pero eso te lo dejo como tarea'
author: 'Tarmo'
image:
  url: 'https://docs.astro.build/assets/full-logo-light.png'
  alt: 'El logotipo completo de Astro.'
tags: ['luz', 'fuego', 'destruccion']
draft: false
layout: ../../layouts/PostLayout.astro
---

Una vez obtenido nuestro volcado de la flash, procedemos con el análisis de las distintas secciones que lo componen, para intentar entender como el router funciona. Para realizar esta tarea, en un primer acercamiento podemos valernos de una herramienta como binwalk, la cual, si utilizamos sobre nuestro volcado, nos proporciona el siguiente resultado:

![binwalk_flash](/blog-tarmo/chapter02/binwalk_flash.png)

Como podemos observar binwalk nos aporta un primer resultado, nuestro firmware se componen de 3 secciones, 2 de ellas comprimidas mediante el algoritmo de compresión LZMA, una inicial de tamaño descomprimido 97728 bytes, otra de tamaño descomprimido 3291456 bytes y un sistema de ficheros.

De este primer resultado, podemos intuir que la segunda particion es el linux comprimido por el tamaño que ocupa y que el sistema de ficheros contiene las distintas aplicaciones que nuestro router utiliza para proveernos de sus servicios.

¿Y el primer trozo?

Si dejamos a binwalk que haga su magia
  ```bash 
binwalk -e hg532-fullflash_backup2.bin 
```
o mediante 7z o cortando ese trozo con dd y unlzma para descomprimir ese trozo y ver el contenido.
Y ejecutamos la aplicación de linux strings sobre el trozo descomprimido, obtenemos entre todo los que nos arroja esto:

```bash
 strings hg532_fullflash_backup2.bin 
``` 

![bootloader_strings](/blog-tarmo/chapter02/bootloader_strings.png)

Vemos que entre las strings se menciona una linea de texto que nos hace ver que ese trozo tiene que ver con el bootloader de nuestro router.

Pero... si el bootloader está comprimido en un primer momento ¿Quien se encarga de descomprimirlo a él para que éste sea lo primero que vemos cuando nos conectamos por la uart?

La respuesta está en que binwwalk reconoce trozos "con cierto formato" en nuestro firmware pero está obviando código importante al inicio de la flash, si observamos bien nuestro bootloader comprimido, éste empieza dentro del volcado de la flash en la dirección 0x21D8 pero... ¿Habrá algo en la dirección 0x0 de nuestra flash?

La respuesta es que sí
