---
title: 'Inicio de la aventura'
pubDate: 2024-04-22
description: 'Primera parte de como decidí arruinarme la vida intentando hacer que un router fuese una lavadora <- Esto lo cambias por lo que tu quieras'
author: 'Tarmop'
image:
  url: 'https://docs.astro.build/assets/full-logo-light.png'
  alt: 'El logotipo completo de Astro.'
tags: ['router', 'exploit', 'doom', 'hacking']
layout: ../../layouts/PostLayout.astro
draft: false
---

En el año 2021, armado con una piedra que eran mis ligeros conocimientos sobre microcontroladores, adquiridos en la universidad ,un palo que era un canal de twitch que decidí abrir para animarme a realizar este tipo de proyectos y con la ayuda de hectorcascos, decidí comenzar un proyecto que ya por aquel entonces establecí en fases.
El plan era el siguiente, quería aprender "las bases" del hardware hacking, para ello, me autoimpuse conseguir ejecutar el doom y encontrar una vulnerabilidad que explotar en un router antiguo (hg532s) que tenía por casa.

![workflow](/blog-tarmo/chapter01/workflow.png)

Sobre la primera parte del plan no tenía muy claro por donde empezar, y sobre la segunda mis conocimientos sobre ingeniería inversa no eran más que algunas incursiones que había hecho a los tutoriales de ricardo narvaja y al canal de liveoverflow.

## Antecedentes

En 2019, debido a una actualización incorrecta de la bios de un amigo, me vi envuelto en mi primer reto de hardware hacking, conseguir reflashear la bios con la actualización correcta, pero en aquel momento me vi con un problema, no tenía una programadora para su bios, y todas las alternativas que realizaban la labor de forma rápida y sencilla (boton gordo y listo) trabajaban con tensiones de 3.3V lo cual no era compatible con su modelo de bios que utilizaba el protocolo spi a 1.8V. La historia finalmente tuvo que resolverse por otros caminos, pero esa espinita de reprogramar tu propia memoria se quedó clavada y decidí intentar obtener el firmware de mi router de la forma lo más general posible, suponiendo que la memoria en cuestión posee un cronograma que tengo que imitar para conseguir efectuar tanto lecturas como escrituras.

## Un poco de electrónica

Con el fin de comunicarte con los niveles adecuados de tensión con la memoria de nuestro router, vamos a comentar brevemente algunas de los métodos de conversión mas sencillos

Un circuito elemental para esta tarea es el divisor de tensión, si quieres obtener una tensión B y tienes una tensión A basta de 2 resistencias en serie con los valores adecuados para obtener la tensión B en bornas de la segunda resistencia. 

![div_res_rl](/blog-tarmo/chapter01/div_res_rl.png)

Siendo I la corriente que atraviesa las dos resistencias

$I = {Vcc \over R_1 + R_2}$

$V_{R_2} = I * {R_2} = Vcc {R_2 \over R_1 + R_2}$

Suponiendo que queremos obtener una tensión de 1.8V a partir de una tensión de 3.3V, podríamos fijar una resistencia por ejemplo R1 y asi obtener tanto R1 como R2, una combinación posible podría ser 100 ohm y 120 ohm


Este sistema de convertir de una tensión a otra es sencillo pero tiene problemas, uno de los problemas es que a altas frecuencias no funciona bien, dado que las resistencias reales no se parecen en nada al modelo ideal de resistencia, lo cual produce que la señal se distorsione. En particular para comunicarte en protocolos tipo UART, SPI (con cuidado), puede servir, pero es importante tener en cuenta que más importante que la señal se degrade es la impedancia de entrada del circuito al que se le quiere inyectar la tensión creada con nuestro divisor de tensión, la cual cuanto más pequeña (más corrirente absorbe) más problemático e incluso inviable puede ser esta conversión *(Es importante destacar que los circuitos que implementan este tipo de protocolos la impedancia de entrada tiende a infinito pero lo comento como algo general).*

Aprovechandonos de la función de "interruptor" que nos proporcionan los transistores otro posible diseño es el siguiente:

![mosfet](/blog-tarmo/chapter01/mosfet.png)

Siendo Vref el nivel de tensión que queremos obtener y que fijaremos mediante una fuente de alimentación. Al aplicar una tensión Vg que provoque que la tensión Vgs sea superior a la tensión Vgsoff o Vp(presente en la datasheet del mosfet) lo que haremos es que el transistor se sature lo que provoca que a efectos prácticos el transistor se comporte como un cortocircuito entre su terminal de drenador (el de arriba) y el terminal de fuente (el conectado a masa) lo que es lo mismo un 0 lógico. Mientras que siempre que la tensión Vg, provoque que la tensión Vgs sea menor que la tensión Vgsoff la corriente Id irá por el cable de salida obteniendo Vref un 1 lógico con lo que con un lenguaje mas informal si por Vg hay señal por la salida no hay y si por Vg no hay por la salida si hay con el nivel de tensión adecuado. 

Este convertidor tiene 2 problemas uno que el valor de la resistencia tiene que ajustarse para tener los niveles de corriente adecuados, lo cual a priori no es mas que $R= {Vref \over I}$ y otro y fundamental y es que los la señal que obtenemos a la salida es la negada de la entrada con el nivel de tensión que queremos, este defecto se puede solucionar encadenando otro transistor para conseguir una puerta not analógica lo cual ya necesita de 2 transistores o jugando con las tensiones del transistor y la forma de alimentarlo de la siguiente forma:

![mosfet2](/blog-tarmo/chapter01/mosfet_2.png)
 
Utilizando un modelo de mosfet con diodo incorporado, los cuales son bastante comunes, si conectamos los terminales Vref a una fuente de alimentación con el nivel de tensión que deseamos obtener y conectando Vin a nuestra señal a convertir, nos vemos en dos situaciones, la primera es que la señal Vin esté a nivel bajo, lo que provoca que el diodo conduzca, estableciendo asi la tensión Vout a nivel bajo, y por otro lado si la tensióñ Vin está a nivel alto, el mosfet está cortado y el diodo también por lo tanto por Vout obtenemos Vref.

Una ventaja no comentada de este ų́ltimo circuito con respecto a los anteriores es que existen protocolos donde el mismo bus puede utilizarse para enviar o recibir bits como es el caso de I2C, los circuitos anteriores ante esta situación no funcionan correctamente, sin embargo éste último si que lo hace.

Existen infinidad de sistemas para convertir niveles de tensión desde con diodos, transistores bjt, operacionales, he adjuntado los que he utilizado en algún momento y más cómodos de usar me parecen.

Ni que decir cabe que ya existen integrados que realizan esta conversión sin tener que pelearnos con elementos discretos analógicos.

![convertidor](/blog-tarmo/chapter01convertidor.png)

## Leer la flash

Si dedicamos 2 minutos a observar el hardware de nuestro router desmontado, podemos observar 5 chips que destacan sobre el resto, si buscamos información sobre cada uno de ellos, es fácil averiguar cual es la memoria encargada de almacenar el firmware de nuestro router.

![board_hg532](/blog-tarmo/chapter01/board_hg532.jpg)

Dato importante: *A la hora de buscar información sobre un producto si éste emite información de forma inalámbrica debe tener un número FCCID que se puede buscar, donde está registrado cierta información sobre el mismo* https://fccid.io/

En nuestro caso nuestra memoria flash (S25FL064PIF) funciona con niveles de tensión de 3.3V, por lo tanto, podemos emplear casi cualquier microcontrolador sin tener que ajustar los niveles de tensión.


### Conectar las pinzas

En mas de un tutorial he visto a gente utilizar unas pinzas como estas conectadas a su microcontrolador favorito

 ![pinzas_flash](/blog-tarmo/chapter01/pinzas_flash.png)

Esta práctica aunque a priori parece cómoda hay que tener una serie de consideraciones antes de emplearla.

Estamos interactuando en un sistema en que la flash está conectada a más cosas,si para comunicarnos con ella conectamos tal cual nuestras pinzas, si el encargado de suministrar la corriente es unicamente nuestro microcontrolador/programador favorito tenemos que asegurarnos de que sea capaz de entregar la corriente necesaria a la memoria y al resto del sistema al que está conectada ésta, siendo conscientes, de que si no sabemos cuanta corriente necesita el resto del sistema probablemente podamos achicharrar nuestro micro favorito. Por esta razón, una práctica interesante para evitarlo es alimentar la memoria mediante una fuente de alimentación aparte y no con la alimentación de nuestro micro.

Cabe destacar que la memoria durante este proceso no debe interferir con nuestro programador, es decir, si ésta mientras intentamos comunicarnos con ella, está comunicandose con la cpu o con otro periférico es probable que no sea posible la adecuada comunicación.

![diagram1](/blog-tarmo/chapter01/diagram1.png)

Otra forma de evitar este problema es cortar la alimentación de la memoria flash del resto del router, este sistema se puede realizar de forma mas o menos sofisticada, yo con ayuda de RealDjChicle corté con un bisturí la linea de la pcb que alimentaba la flash y soldando entre cada extremo un interruptor que me permitiera aislarla o no en función de si queria reprogramarla o que la usara el router.

*Nota: En un inicio opté por la primera opción alimentar con una fuente de alimentación, dado que un estado normal la flash solo se comunica con la cpu durante el arranque, pero si produces algún tipo de error modificando el contenido de la flash, es probable que dejes el router en un estado en que continuamente la cpu intente comunicarse con ella y no lo consiga provocando que no seas capaz de comunicarte con la flash, es por ello que recomiendo la segunda opción.*

### Elección del programador

Una práctica bastante común dentro del hardware hacking es el bit-banging, conociendo cuales son los cronogramas, dado que tenemos datasheets en los que se indica como nuestra memoria flash se comunica o bien por que disponemos de un osciloscopio/analizador lógico para ver como interactúa con el sistema, es tan "sencillo" como identificar y copiar esos cronogramas.

Una forma de recrearlos es utilizando un uC con sus GPIO o mediante una FPGA. El utilizar una FPGA, tener que lidiar con VHDL o Verilog me parece overengineering para esta tarea en concreto. *Aunque ahora existen alternativas muy interesantes que te permiten utilizando un lenguaje de scripting flexibilidad total https://glasgow-embedded.org/latest/intro.html*

El utilizar un microcontrolador es otra opcion pero existen opciones mas sencillas y baratas, es por ello que me decanté por un dispositivo de la familia ft232h que lo puedes encontrar por no mas de 3 euros

![ft232h](/blog-tarmo/chapter01/ft232h.png)

El ftdi232h no es mas que un convertidor usb-serie y viceversa y su uso es tan sencillo como desde python utilizar la libreria pyftdi para poder comunicarnos con nuestra placa.

Es cierto que con el propio ftdi232h existe software que ya realiza esta tarea por ti *https://www.flashrom.org/* pero me apetecía jugar un poco y quería realizar mis scripts para efectuar una lectura y una escritura a mano.

Si nos fijamos en la datasheet de nuestra memoria flash, podemos observar que una operacion de lectura se realiza de la siguiente forma:

![readop](/blog-tarmo/chapter01/readop.png)

Como hemos comentado se trata del protocolo SPI, éste tiene una señal de reloj, que marca en que ciclos y como se debe realizar la comunicación con la memoria. En este caso en concreto se marca que durante los 8 primeros ciclos de la señal SCLK lo que se envie por el pin MOSI será el comando de lectura, que si buscamos en la propia datasheet no es más que enviar un 0x3, seguido de la dirección que se quiere leer que están establecidas en la datasheet, y ésta entregará el valor en esa dirección por el pin MISO

![readop2](/blog-tarmo/chapter01/readop2.png)

Con ayuda de la documentación de la API de la librería pyftdi
*https://eblot.github.io/pyftdi/*, podemos realizar nuestro script con el que leer nuestra memoria

``` 
from pyftdi.ftdi import * 
from pyftdi.spi import * 

FLASH_SIZE = 0x800000
read_command = b'\x03'

spi = SpiController()
spi.configure('ftdi://ftdi:2232:2:18/1') #CAMBIAR POR TU DISPOSITIVO

slave = spi.get_port(cs=0,freq = 10E6)

def fread(slave):
    fd = open('dump','wb') #Fichero con el volcado de la flash
    address = b'\x00\x00\x00' #Direccion de inicio de la flash

    slave.write(read_command + address, start=True, stop=False) #assert nCS and keep it asserted

    #En la datasheet se especifica que una vez mandado el comando no tenemos por que remandarlo que irá volcando valores de memoria hasta que pongamos a nivel alto el pin cs

    for i in range(FLASH_SIZE-1):  
        data_out=slave.read(1, start=False, stop=False) # don't touch nCS
        fd.write(data_out)
    data_out=slave.read(1, start=False, stop=True) #read last byte and deassert nCS, terminating the operation

    fd.write(data_out) 
    fd.close() 

fread(slave)
```
Y voila!, ya tenemos una forma de conseguir el volcado de la flash sin utilizar ninguna programadora específica ni ningún software especializado, ni funcionalidades del propio router que te ayuden con este cometido. 

Escribir en la memoria flash es análogo y no tiene mucha ciencia comentarlo.

## Otros protocolos interesantes

A parte del protocolo spi empleado para comunicarse la cpu con la memoria flash y que hemos empleado nosotros para extraer el contenido de la memoria. Algo recomendable que es importante realizar es buscar otros protocolos de comunicación que nos puedan aportar más información sobre como el dispositivo funciona, como JTAG (protocolo de depuración) que nos permiten tener control total del hardware del router o la UART que nos puede dar información sobre lo que está ejecutando el mismo.

*Nota: Importante que muchas veces pueden no estar integrados o desactivados por el fabricante en el momento del arranque, siendo esta segunda opción materia de otro tipo de temas, como ataques de canal lateral*

Sobre estos temas de como encontrar este tipo de pines que tengan esa funcionalidad, existen herramientas que automatizan esta tarea, aun sin disponer de estas herramientas existen formas artesanales de encontrar este tipo de pines. En general un primer acercamiento a buscar este tipo de pines suele ser buscar en la pcb si existe algun indicio de alguna conexión que no está soldada, en nuestro caso, existe una hilera que alguien antes que nosotros se ha encargado de documentar e indicar que corresponde con la UART.

![hg532s-uart](/blog-tarmo/chapter01/hg532s-uart.jpg)

En caso de no estar tan visible, existen formas valiéndonos del multímetro para la búsqueda de ciertos valores de referencia.

Sobre este tema existe una serie de videos bastante mítica en que entre los temas que se hablan, se habla sobre ello


[How To Find The UART Interface](https://www.youtube.com/watch?v=6_Q663YkyXE)

Utilizando el mismo ft232h para conectarnos a los pines indicados en la imagen superior y si no se dispone de osciloscopio/analizador lógico/uC para calcular el baudrate y poder ver las distintas propiedades de la trama serie, como por ejemplo si tiene bit de CRC, número de bits enviados... Generalmente probando diferentes baudrates con el siguiente comando, donde el numero del final es el baudrate, se puede conseguir el visualizar algo legible, siempre y cuando no sea un caso algo particular de trama.

Con:
```
screen /dev/ttyUSB0 115200
```

Obtendremos lo siguiente:


```
RT63365 at Wed Dec 17 16:09:06 CST 2014 version 0.8

Memory size 32MB

Found SPI Flash 8MiB S25FL064A at 0xb0000000

Press any key in 3 secs to enter boot command mode.
Search PHY addr and found PHY addr=0
..........................................................
```

Esta string indica que nuestro router tiene un bootloader el cual podemos acceder pulsando alguna tecla en nuestra consola screen, lo que provocará que se mande algun valor por la uart que haga que entremos en el menu del bootloader, que se muestra de la siguiente forma:

```
RT63365 at Wed Dec 17 16:09:06 CST 2014 version 0.8

Memory size 32MB

Found SPI Flash 8MiB S25FL064A at 0xb0000000

Press any key in 3 secs to enter boot command mode.
Search PHY addr and found PHY addr=0

bldr> 
bldr> help
                                                                              
?                                   Print out help messages.                  
help                                Print out help messages.                  
go                                  Booting the linux kernel.                 
decomp                              Decompress kernel image to ram.           
memrl <addr>                        Read a word from addr.                    
memwl <addr> <value>                Write a word to addr.                     
dump <addr> <len>                   Dump memory content.                      
jump <addr>                         Jump to addr.                             
flash <dst> <src> <len>             Write to flash from src to dst.           
erase_write <dst> <src> <len>       Write to flash from src to dst.           
imageflash                          Write bin/w image to flash.               
xmdm <addr> <len>                   Xmodem receive to addr.                   
miir <phyaddr> <reg>                Read ethernet phy reg.                    
miiw <phyaddr> <reg> <value>        Write ethernet phy reg.                   
webser                              webser                                    
cpufreq <freq num> / <m> <n>        Set CPU Freq <156~450>(freq has to be multiple of 6)
ipaddr <ip addr>                    Change modem's IP.                        
bldr> 
```

LLegados a este punto, por el momento no vamos a mencionar mas temas de electrónica y empezaremos a indagar en el firmware del router, que el doom y los exploits no se consiguen tocando solo cables bye!


## Adenda

Dentro del bootloader que trae el router entre las opciones que tiene una de ellas es dumpear la flash/escribir en ella mediante la uart, o reprogramarla mediante tftp. Inicialmente se realizaron scripts para realizar todas las modificaciones por esas vias, pero estas vias adolecen de varios problemas.
Por el camino de la uart es un proceso muy lento, que rapidamente fue descartado. El camino de tftp es viable pero dependes de que tu bootloader funcione correctamente y si realizas modificaciones como es mi caso, es fácil en algun momento si dependes solo de ese camino quedarte sin poder interactuar debido a posibles brickeos ya comentados y sus consecuencias. Es por estas razones y por no depender de si el fabricante ha tenido la generosidad de dejarnos código para esta tarea que elegí el camino descrito anteriormente.

Adjunto el trabajo previo ya hecho en este router y que fue usado en los inicios de este proyecto por parte de danitool

*https://github.com/danitool/bootloader-dump-tools/blob/master/rt63365tool.py*