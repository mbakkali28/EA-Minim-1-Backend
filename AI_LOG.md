### Secció d'Ús d'IA Generativa

**Eina i Model utilitzat**: Deepseek-v4.1-flash

---

### Prompts

#### Prompt 1: com munto el model amb un vector de subdocuments
- **Model**: deepseek-v4.1-flash
- **Pregunta**:
  > *"Com defineixo en Mongoose un model nou que pengi d'una entitat que ja existeix i que porti un vector de subdocuments, on cada pas tingui com a mínim cinc tipus de dada diferents? I com hi afegeixo el borrat lògic?"*
- **Resposta de la IA**:
  El pas es declara com un `Schema` a part i després s'incrusta dins del document com un array. Al pas hi van: `status` com a text limitat per un enum, `comment` com a text, `at` com a `Date` amb valor per defecte, `by` com a `ObjectId` amb `ref: 'User'` per poder-lo resoldre després, `automatic` com a booleà i `version` com a número obligatori amb mínim 1. Al document pare hi van els camps del borrat lògic, `isDeleted` (per defecte `false`) i `deletedAt` (per defecte `null`), i la referència a l'entitat existent amb `ref` i `required`. Els índexs es declaren amb `schema.index(...)` i no com a opció del camp, perquè Mongoose ignora opcions com `partialFilterExpression` si van dins del camp.
- **Incoherències detectades**:
  - La IA va afegir al mateix fitxer una taula de transicions `Record<RequestStatus, RequestStatus[]>` que no formava part de la petició.
- **Solució / Adaptació manual**:
  El model és `src/models/Request.ts`, amb tres índexs pensats per als listats (autor i data, estat i tipus, rutina). Es va comprovar llegint la base de dades que un pas real del historial té els cinc tipus: `string`, `Date`, `ObjectId`, `boolean` i `number`. La taula de transicions es va retirar.

---

#### Prompt 2: com indexo el model per als dos listats que necessito
- **Model**: deepseek-v4.1-flash
- **Pregunta**:
  > *"Tinc dos listats sobre la mateixa col·lecció: un per usuari i un altre per a l'administrador, que filtra per estat i tipus. Com tria els índexs i com els declaro?"*
- **Resposta de la IA**:
  Un índex per a cada consulta real, amb els camps en l'ordre en què es filtren i s'ordenen: `{ requester: 1, isDeleted: 1, createdAt: -1 }` per al listat d'un usuari, `{ isDeleted: 1, status: 1, type: 1 }` per al de l'administrador i `{ workout: 1 }` per a les sol·licituds d'una rutina. L'ordre dels camps importa: el camp que sempre apareix al filtre va primer, i el d'ordenació al final. Es declaren amb `schema.index(...)`, mai com a opció dins del camp.
- **Incoherències detectades**:
  - Cap d'índex és únic, i això és una decisió conscient: res impedeix dues sol·licituds iguals.
- **Solució / Adaptació manual**:
  Els tres índexs són a `src/models/Request.ts` i es van comprovar amb `getIndexes()` des de MongoDB. El de la rutina també serveix per trobar què esborrar quan es netegen dades.

---

#### Prompt 3: com faig el llistat paginat amb populate i dos filtres a la mateixa ruta
- **Model**: deepseek-v4.1-flash
- **Pregunta**:
  > *"Com construeixo un llistat paginat al servidor, amb populate de dues relacions i un buscador de text que es combini amb filtres exactes a la mateixa ruta?"*
- **Resposta de la IA**:
  Primer es construeix un objecte de filtre sumant condicions: els filtres exactes (`status`, `type`, `workout`) com a camps i el text amb un `RegExp` sobre dos camps enllaçats amb `$or`, escapant el text perquè caràcters com `(` o `+` no trenquin la consulta. Després, el `find` porta `sort`, `skip` i `limit`, i els dos `populate` amb `select` per portar-se només el que es mostra. El `countDocuments` ha de fer servir **el mateix filtre** que el `find`, o la paginació menteix. Per calcular salts, límits i metadades es reutilitzen les utilitats del projecte.
- **Incoherències detectades**:
  - El `populate` no filtrava les relacions esborrades: una sol·licitud podia ensenyar el nom d'una rutina que l'`ADMIN` ja havia eliminat.
- **Solució / Adaptació manual**:
  És `listRequests` a `src/services/RequestService.ts`, amb `getSkip`, `buildPageInfo`, `buildSort` i `escapeRegex` de `src/utils/pagination.ts`. Comprovat amb `curl`: `?search=reserva&status=PENDING&type=RESERVA` torna un resultat, i `page=2&limit=2` torna la pàgina 2 de 3.

---

#### Prompt 4: com faig una guarda de propietari o ADMIN sobre el JWT que ja tinc
- **Model**: deepseek-v4.1-flash
- **Pregunta**:
  > *"Ja tinc un middleware de JWT que deixa l'usuari a req.user i un altre que comprova el rol. Com faig que en una ruta amb id només passi el propietari del document o un ADMIN, sense duplicar codi?"*
- **Resposta de la IA**:
  El middleware de rol no serveix, perquè només mira el rol i no el document. Cal una guarda que carregui el document per id i compari el camp del propietari amb `req.user.id`. L'ordre de les respostes és el que dona sentit a la guarda: 404 si no existeix o si està borrat i qui pregunta no és `ADMIN` (per no filtrar que existeix), i 403 només quan existeix i és d'una altra persona. La guarda s'escriu amb la mateixa forma que la del rol —una funció que retorna el middleware— i es munten totes dues al mateix router.
- **Incoherències detectades**:
  - La IA va crear un fitxer de middleware nou en comptes d'ampliar el que ja hi havia.
  - També va escriure `res.locals.request` "per si el controlador el necessita", i el controlador no el llegia.
- **Solució / Adaptació manual**:
  La guarda viu dins de `src/middleware/RequireRole.ts`, al costat del middleware de rol, i el fitxer nou es va esborrar. Comprovat amb `curl`: 401 sense token, 200 la pròpia, 403 l'aliena, 200 com a `ADMIN`; i les dinou rutes del projecte que fan servir el middleware de rol segueixen responent igual.

---

#### Prompt 5: com canvio l'estat i apunto el pas en una sola actualització
- **Model**: deepseek-v4.1-flash
- **Pregunta**:
  > *"Com canvio l'estat d'un document i hi afegeixo el pas a l'historial en la mateixa actualització, sense que quedi un estat sense pas ni un pas sense estat?"*
- **Resposta de la IA**:
  Fer-ho en una sola crida: `findByIdAndUpdate` amb `$set` de l'estat nou i `$push` del pas, amb el número de versió calculat a partir de l'últim pas ja carregat. Les regles es comproven **abans** d'escriure, perquè un rebuig no ha de tocar el document. I l'ordre de les comprovacions importa: primer si l'estat actual permet moure's, després el permís de qui ho demana.
- **Incoherències detectades**:
  - Repetir el mateix estat s'accepta i afegeix un pas de més al historial.
  - Sense taula de transicions, un `ADMIN` pot tornar una sol·licitud de `CANCELLED` a `APPROVED`.
- **Solució / Adaptació manual**:
  És `changeStatus` a `src/services/RequestService.ts`. Comprovat amb `curl`: des d'un estat completat dona 409 sense escriure res, un usuari que aprova dona 409 i cancel·lar dona 200 amb el pas apuntat. Les dues incoherències queden com a límits coneguts.

---

#### Prompt 6: com faig el borrat lògic i el definitiu amb comptes fiables
- **Model**: deepseek-v4.1-flash
- **Pregunta**:
  > *"Com faig el borrat lògic i el definitiu, d'un document i de diversos alhora, de manera que el nombre de documents afectats que retorno sigui fiable?"*
- **Resposta de la IA**:
  Per al lògic, `updateMany` filtrant també `isDeleted: false` i tornant `modifiedCount`: així els que ja estaven borrats no compten. Per al definitiu, `deleteMany` i `deletedCount`. Per a un sol document, `findOneAndUpdate` i `findOneAndDelete`, que retornen el document per poder respondre 204 o 404. El filtre ha de portar sempre l'id i el propietari quan qui pregunta no és administrador, perquè el comptador no és l'única protecció.
- **Incoherències detectades**:
  - La petició inicial no deia què havia de passar amb els documents ja borrats; la IA ho va decidir per compte propi.
- **Solució / Adaptació manual**:
  Són quatre mètodes de `src/services/RequestService.ts` i quatre rutes de `src/routes/Request.ts`, amb el borrat definitiu i els dos massius reservats a `ADMIN`. Comprovat amb `curl`: 204 en un, 404 després per al propietari, 200 amb el compte correcte en els massius i 403 si qui ho intenta no és `ADMIN`.

---

#### Prompt 7: com valido el cos, la query i l'id amb les guardes que ja existeixen
- **Model**: deepseek-v4.1-flash
- **Pregunta**:
  > *"Com valido el cos i la query d'una ruta nova reutilitzant les guardes de Joi del projecte, i com distingeixo un id mal format d'un cos incorrecte?"*
- **Resposta de la IA**:
  Cada cosa té la seva guarda i el seu codi: el format de l'id es comprova amb una expressió regular de 24 caràcters hexadecimals i respon 400, i el cos i la query es validen amb Joi i responen 422. La query no es pot reassignar a Express 5, així que el resultat validat es deixa a `res.locals` i el controlador el llegeix d'allà. Pels esquemes cal recordar dues coses: `Joi` rebutja per defecte les claus desconegudes (així el cos no pot portar camps com l'autor o l'estat) i `.min(1)` obliga que un cos d'edició porti almenys un camp.
- **Incoherències detectades**:
  - La IA va treure els `.example()` dels esquemes de Joi, i amb ells es van perdre els exemples que alimentaven la documentació.
- **Solució / Adaptació manual**:
  És a `src/middleware/Joi.ts` (`Schemas.request.create`, `update`, `status` i `Schemas.query.request`) i a les rutes de `src/routes/Request.ts`. Comprovat amb `curl`: `{}` dona 422 amb "must have at least 1 key", un cos amb `status` dona 422 "is not allowed" i un id mal format dona 400.

---

#### Prompt 8: com retorno 404 i 409 des del servei sense inventar errors nous
- **Model**: deepseek-v4.1-flash
- **Pregunta**:
  > *"Els errors de negoci del servei —un recurs que no existeix, una regla que no es compleix— com els converteixo en 404 i 409 sense afegir un sistema d'errors nou al projecte?"*
- **Resposta de la IA**:
  El projecte ja té un `ErrorHandler` que llegeix `error.status` i `error.details`. N'hi ha prou de llançar un `Error` amb el codi adjuntat, per exemple amb `Object.assign(new Error(missatge), { status })`, i deixar que el controlador passi l'error amb `next(error)`. Els errors de Joi ja porten `details` i surten com a 422; els de Mongoose, com el duplicat de clau, surten com a 409. No cal cap classe nova ni cap codi d'error inventat.
- **Incoherències detectades**:
  - El servei llançava 404 i 409, però el controlador encara tenia el costum de respondre 404 pel seu compte quan el servei retornava `null`: dues maneres de dir el mateix.
- **Solució / Adaptació manual**:
  El servei llança amb el codi adjunt i els controladors de `src/controllers/Request.ts` només decideixen el 200, el 201 o el 204; la resta passa per `src/middleware/ErrorHandler.ts`. Comprovat amb `curl`: 404 amb "La rutina no existe" i 409 amb "Solo se puede modificar una solicitud pendiente".
