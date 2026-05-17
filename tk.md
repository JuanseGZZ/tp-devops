Vamos a hacer:
en realidad es de todo un poco porque , tenemos que conectar una base de datos para poder hacer Logs de las cosas para que las herramientas de monitorizacion puedan agarrar esos logs, sino no tendriamos para montorizar esa parte, despues el chabon hablo de tipos de vulneravilidades en la ultima clase, asi que tenemos que diseniar la app para que no se coma SQL injection, estaria bueno ponerle un Ratelimit (o sea que no puedan mandar 400 millones de petisiones en 1 segundo) y un cache tambien estaria bien, meterle un sistema de usuarios basico, porque tenemos que hacer que haya una api privada asi se ve eso de la segurizacion y pruebas.

sintesis:
app con
- sistema de usuarios basico
- que no se morfe sql injection
- con base de datos
- con funciones de testing


Vamos a hacer una app que use jwt para loguear, que tenga una base de datos que se guarde en vez de la password el hash de la misma.
una vez que se loguea puede entrar al chat.
Va a ser un solo feed que sea un chat donde puedas escribir algo, y se carga todo los mensajes de todos, o sea va a ser como un grupo de watsap, o sea va a estar la pantalla de logeo y luego directamente al entrar estas en el chat, asi que va a tener que haber sanitizacion de datos para que no hay ni sqlinjection ni crossite scripting.
En la pantalla de logueo se va a poder registrar mandando un mail, al mail le va allegar un codigo generado y eso va a usar para validar ese user.
Tiene que haber ritelimit de peticiones.
Tiene que haber captcha para crear un usuario, antes de poder mandar codigo al mail deberias hacer un captcha, ademas, vamos a hacer que solo puede mandar 3 direcciones en un dia una ip espesifica.

Vamos a tener que hacerle funciones de testing unitario y modular a las cosas.


espesificaciones del sistema:
frontend: js vanilla.
backend: nodejs.
database: postgres.

notas?:
todo en distintos contenedore y sus conecciones entre los mismos, ademas que cada contenedor su imagen deberia ser multistage, y que la de base de datos deberia perceberar datos.


modulos que se me ocurren:
Auth. Email. Feed.

models que se me ocurren(iterar para hacer escalable, y algo de observer si es necesario):
User:
- username
- email
- email_validation
- password
- chats
Chat:
- id
- messages
Message:
- User
- message
- date



Vamos a hacerlo todo pensando en un UML bueno y escalable a futuro pero sin sobreingenierar, es decir un modelo solido para ampliar pero sin programar cosas que no vamos a usar ahora.

probablemente vamos a usar un observer para hacer que hoy sea un chat de subscripcion, pero manana puedan ser varios feeds.

ESTRUCTURA DE ARCHIVOS

en back tenemos>
dtos, api, service, models y repocitories.

en front tenemos>
events, api, dtos, models, y render.

