const express = require('express');
const sqlite3 = require('sqlite3');


const app = express();
app.use(express.static('static'));
app.use(express.json({limit: '50mb'}));
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`listening at port ${port}`);
});
//app.use(express.bodyParser({limit: '50mb'}));

let db = new sqlite3.Database('proyectoPura.db', (err)=> {
	if (err) {
		console.error(err.message);
	} else {
		console.log('Connected to proyectoPura.db');
		/*db.all('PRAGMA table_list;', (err,rows)=>{
			if (err) {
				console.log(err.message);
			} else {
				console.log(rows);
			}
		});*/
	}
});

app.get('/ping', (request,response)=>{
	response.json({data:'Hello server!'});
});
app.get('/favico.ico', (req, res) => {
    res.sendStatus(404);
});


app.get('/numswithdata', async (request,response)=>{
	//const sql1 = `SELECT ID_NumRevista, ID_Director FROM NUMEROS_REVISTA AS a WHERE (SELECT ID_NumRevista FROM NUMREVISTA_PERSONA_RELACIÓN WHERE ID_NumRevista = a.ID_NumRevista);`;
	const sql1 = `SELECT ID_NumRevista, Título_Revista, Fecha, Número, Lugar_Publicación, ID_Director FROM NUMEROS_REVISTA AS a WHERE (SELECT ID_NumRevista FROM NUMREVISTA_PERSONA_RELACIÓN WHERE ID_NumRevista = a.ID_NumRevista);`;
	db.all(sql1, (err,rows)=>{
		if (err) {
			console.log(err.message);
			response.end();
		} else {
			//console.log(rows);
			const data = {"data" : rows};
			console.log(data.data);
			console.log('about to send data');
			return response.json(data);
		}
	});

});

function PromiseDBall(sql) {
	return new Promise((resolve, reject)=> {
		db.all(sql, (err,rows)=>{
			if (err) {
				console.error(err.message);
				reject(err);
			} else {
				resolve(rows);
			}
		});
	});
}


function GetAutSecciones(data) {

}

function GetColabs(data) {

}

app.get('/reddataallnum', async (req,res)=>{
	const directores_sql = `SELECT ID_Persona FROM DIRECTORES;`
	let promisedirectores = PromiseDBall(directores_sql);
	const directores = await promisedirectores;
	console.log(directores);
	const resultsbydir = {};
	const all_results = [];
	for (const n in directores) {
		const dirid = directores[n].ID_Persona;
		const director_sql = `SELECT ID_Persona, nombre_completo, género, wikilink FROM PERSONAS WHERE ID_Persona=${dirid};`;
		let promisedirector = PromiseDBall(director_sql);
		director = await promisedirector;
		director = director[0];

		const numsdir_sql = `SELECT ID_NumRevista FROM NUMEROS_REVISTA WHERE ID_Director=${dirid};`
		let promisenumsdir = PromiseDBall(numsdir_sql);
		var numsdir = await promisenumsdir;
		var numsdir_include = "(";
		Array.from(numsdir).forEach((num)=>{
			numsdir_include+=num.ID_NumRevista.toString()+',';
		});
		numsdir_include=numsdir_include.slice(0,-1)+')';

		const sql_personas = `SELECT DISTINCT NUM.ID_Persona, PERSONAS.nombre_completo, PERSONAS.género, PERSONAS.wikilink
		FROM NUMREVISTA_PERSONA_RELACIÓN AS NUM
		JOIN PERSONAS ON (PERSONAS.ID_Persona = NUM.ID_Persona)
		WHERE ID_NumRevista IN ${numsdir_include};`// AND NOT PERSONAS.ID_Persona = ${dirid}
		let promisepersonas = PromiseDBall(sql_personas);
		const personas = await promisepersonas;
		var directorenpersonas=false;
		//console.log(personas);

		const sql_autores = `SELECT DISTINCT NUM.ID_Persona, OBRAS.ID_Obra
			FROM NUMREVISTA_PERSONA_RELACIÓN as NUM
			JOIN OBRAS ON (OBRAS.ID_Autor=NUM.ID_Persona)
			WHERE NUM.ID_NumRevista IN ${numsdir_include} AND NUM.TipoRelación = "autor obra" AND OBRAS.ID_Autor=NUM.ID_Persona AND OBRAS.ID_NumRevista IN ${numsdir_include} ;`; //AND NOT NUM.ID_Persona = ${dirid}
		
		let promiseautores = PromiseDBall(sql_autores);
		const autores = await promiseautores;
		//console.log(autores);
		const autoresdic = {};
		for (const n in autores) {
			const autor = autores[n];
			const autorid = autor.ID_Persona;
			const obraid = autor.ID_Obra;
			if (autoresdic.hasOwnProperty(autorid)) {
				autoresdic[autorid]['Publicaciones'].push(obraid);

			} else {
				autoresdic[autorid] = {'Publicaciones': [obraid]};
			}
		
		}
		//console.log(autoresdic);

		const sql_allautores = `SELECT DISTINCT ID_Autor FROM OBRAS;`;
		let promiseallautores = PromiseDBall(sql_allautores);
		const all_autores = await promiseallautores;
		const autores_list = [];
		for (const n in all_autores) {
			const id_autor = all_autores[n].ID_Autor;
			autores_list.push(id_autor);
		}
		
		const sql_autsecciones = `SELECT DISTINCT NUM.ID_Persona, SECCIONES_PUBLICADAS.ID_SecciónPublicada
		FROM NUMREVISTA_PERSONA_RELACIÓN as NUM
		JOIN SECCIONES_PUBLICADAS ON (SECCIONES_PUBLICADAS.ID_Autor=NUM.ID_Persona)
		WHERE NUM.ID_NumRevista IN ${numsdir_include} AND NUM.TipoRelación = "autor sección" AND SECCIONES_PUBLICADAS.ID_Autor=NUM.ID_Persona AND SECCIONES_PUBLICADAS.ID_NumRevista IN ${numsdir_include} ;`//AND NOT NUM.ID_Persona = ${dirid}
		let promiseautsecciones = PromiseDBall(sql_autsecciones);
		const autsecciones = await promiseautsecciones;
		//console.log(autsecciones);
		for (const n in autsecciones) {
			const autor = autsecciones[n];
			const autorid = autor.ID_Persona;
			const seccionid = autor.ID_SecciónPublicada;
			console.log(autorid, seccionid);
			if (autoresdic.hasOwnProperty(autorid)) {
				autoresdic[autorid]['Publicaciones'].push(seccionid);

			} else {
				autoresdic[autorid] = {'Publicaciones': [seccionid]};
			}

		}
		//console.log(autoresdic);

		const sql_colabs = `SELECT DISTINCT ID_Persona
			FROM NUMREVISTA_PERSONA_RELACIÓN 
			WHERE ID_NumRevista IN ${numsdir_include} AND TipoRelación = "colaborador general";`;
		let promisecolabs = PromiseDBall(sql_colabs);
		const colabs = await promisecolabs;
		const colabsid = [];
		for (const n in colabs) {
			colabsid.push(colabs[n].ID_Persona);
		}
		
		const personasids = [];
		const results = [];
	
		for (const n in personas) {
			const persona = personas[n]
		
			const persona_dic = {'ID_Persona':persona.ID_Persona, 'nombre': persona.nombre_completo, 'género': persona.género, 'image_url': persona.wikilink};
			console.log(persona_dic.image_url);
			if (autores_list.includes(persona.ID_Persona)) {
				persona_dic['tipo_persona'] = 'autor';
			} else {
				persona_dic['tipo_persona'] = 'colab_noautor';
			}
		
			if (persona.ID_Persona==director.ID_Persona) {
				directorenpersonas=true;
				persona_dic['director']=true;
			} else {
				persona_dic['director'] = false;
			}
			
			if (autoresdic.hasOwnProperty(persona.ID_Persona) && colabsid.includes(persona.ID_Persona) ) {
				persona_dic['colab'] = true;
				persona_dic['autor'] = true;
				persona_dic['Publicaciones'] = autoresdic[persona.ID_Persona].Publicaciones;
			
			} else if (autoresdic.hasOwnProperty(persona.ID_Persona)) {
				persona_dic['colab'] = false;
				persona_dic['autor'] = true;
				persona_dic['Publicaciones'] = autoresdic[persona.ID_Persona].Publicaciones;
			} else if (colabsid.includes(persona.ID_Persona)) {
				persona_dic['colab'] = true;
				persona_dic['autor'] = false;
				persona_dic['Publicaciones'] = null;
			} else {
				console.log(`something not taken into account with person ${persona.ID_Persona}`);
			}
			personasids.push(persona.ID_Persona);
			results.push(persona_dic);
		
		}
	
		resultsbydir[dirid] = {}
		for (const n in personasids){
			const personaid = personasids[n];
			console.log(personaid == results[n].ID_Persona);
			resultsbydir[dirid][personaid]= results[n];
		}
		//console.log(resultsbydir);
		

	}
	const resultsdic = {};
	for (const dirid in resultsbydir){
		
		for (const idp in resultsbydir[dirid]) {
			const links_dir = [];
			if (resultsdic.hasOwnProperty(idp)){
				const dicp = resultsbydir[dirid][idp];
				const basicdic = resultsdic[idp];
				const links = [];
				const idp1 = basicdic.ID_Persona;
				const personasids_include = "("+Array.from(Object.keys(resultsbydir[dirid])).join(',')+")";
				const afinidad_sql = `SELECT * FROM AFINIDADES_PERSONAS WHERE ID_Persona1 = ${idp1} AND ID_Persona2 IN ${personasids_include};`;
				let promiseafinidad = PromiseDBall(afinidad_sql);
				const afinidades = await promiseafinidad;
				if (afinidades.length>0){
					for (const n in afinidades) {
						const afinidad = afinidades[n];
						const idp2 = afinidad.ID_Persona2;
						const totalnum = afinidad.Total_NumComunes;
						const link = {'source': parseInt(idp1), 'target': parseInt(idp2), 'type': 'afinidad', 'value': totalnum};
						links.push(link);
						
					}
				}
				if (idp1!=dirid) {
					const totalnum_dir_sql = `SELECT ID_NumRevista FROM NUMEROS_REVISTA WHERE ID_Director=${dirid};`
					let promisetotalnumdir = PromiseDBall(totalnum_dir_sql);
					var totalnum_dir = await promisetotalnumdir;
					totalnum_dir= totalnum_dir.length;
					const reldir_sql = `SELECT * FROM RELACIONES_DIRECTORES WHERE ID_Director = ${dirid} AND ID_Persona= ${idp1};`;
					let promisereldir = PromiseDBall(reldir_sql);
					const relsdir = await promisereldir;
					for (const n in relsdir) {
						const reldir = relsdir[n];
						const totalnum = reldir.Total_NumComunes;
						//console.log(reldir);

						if (dicp['autor']==true){
							const link = {'source': parseInt(dirid), 'target': parseInt(idp1), 'type': 'autor', 'value': totalnum, 'totalnumdir':totalnum_dir};
							links.push(link);
						}
						if (dicp.colab==true){
							const link = {'source': parseInt(dirid), 'target': parseInt(idp1), 'type': 'colab', 'value': totalnum, 'totalnumdir':totalnum_dir};
							links.push(link);
						}
					}
				}
				const all_links = [];
				console.log('two lists');
				console.log(basicdic.links, links);
				Array.from(links).forEach(link=>{
					all_links.push(link);
				});
				Array.from(basicdic.links).forEach(link=>{
					all_links.push(link);
				});
				//basicdic.links.concat(links);
				if (basicdic.Publicaciones && dicp.Publicaciones){
					basicdic.Publicaciones.concat(dicp.Publicaciones);
				}else if (basicdic.Publicaciones && dicp.Publicaciones==null){
					basicdic.Publicaciones= basicdic.Publicaciones;
				} else if (basicdic.Publicaciones==null){
					basicdic.Publicaciones = dicp.Publicaciones;
				}
				console.log('one list?');
				console.log(all_links);
				basicdic.links = all_links;
				resultsdic[idp] = basicdic;
				console.log('same list?');
				console.log(basicdic.links);
				//console.log(idp);
				//console.log(dicp.Publicaciones, basicdic.Publicaciones);


			} else {
				const dicp = resultsbydir[dirid][idp];
				const basicdic = {'ID_Persona': dicp.ID_Persona, 'nombre': dicp.nombre, 'género':dicp.género, 'tipo_persona':dicp.tipo_persona, 'image_url':dicp.image_url, 'Publicaciones':dicp.Publicaciones};
				const links = [];
				const idp1 = basicdic.ID_Persona;
				const personasids_include = "("+Array.from(Object.keys(resultsbydir[dirid])).join(',')+")";
				const afinidad_sql = `SELECT * FROM AFINIDADES_PERSONAS WHERE ID_Persona1 = ${idp1} AND ID_Persona2 IN ${personasids_include};`;
				let promiseafinidad = PromiseDBall(afinidad_sql);
				const afinidades = await promiseafinidad;
				if (afinidades.length>0){
					for (const n in afinidades) {
						const afinidad = afinidades[n];
						const idp2 = afinidad.ID_Persona2;
						const totalnum = afinidad.Total_NumComunes;
						const link = {'source': parseInt(idp1), 'target': parseInt(idp2), 'type': 'afinidad', 'value': totalnum};
						links.push(link);
						
					}
				}
				if (idp1!=dirid) {
					const totalnum_dir_sql = `SELECT ID_NumRevista FROM NUMEROS_REVISTA WHERE ID_Director=${dirid};`
					let promisetotalnumdir = PromiseDBall(totalnum_dir_sql);
					var totalnum_dir = await promisetotalnumdir;
					totalnum_dir= totalnum_dir.length;
					const reldir_sql = `SELECT * FROM RELACIONES_DIRECTORES WHERE ID_Director = ${dirid} AND ID_Persona= ${idp1};`;
					let promisereldir = PromiseDBall(reldir_sql);
					const relsdir = await promisereldir;
					for (const n in relsdir) {
						const reldir = relsdir[n];
						const totalnum = reldir.Total_NumComunes;
						//console.log(reldir);

						if (dicp['autor']==true){
							const link = {'source': parseInt(dirid), 'target': parseInt(idp1), 'type': 'autor', 'value': totalnum, 'totalnumdir':totalnum_dir};
							links.push(link);
						}
						if (dicp.colab==true){
							const link = {'source': parseInt(dirid), 'target': parseInt(idp1), 'type': 'colab', 'value': totalnum, 'totalnumdir':totalnum_dir};
							links.push(link);
						}
					}
				} 
				basicdic.links = links;
				resultsdic[idp] = basicdic;

			}
		}
		//modifier pubs des 2 directeurs... ou pas forcément?
	}
	//console.log(resultsdic);
	
	for (const idp in resultsdic){
		all_results.push(resultsdic[idp]);
	}
	res.json({data:all_results});
}); 

app.post('/reddatanum', async (req, res) => {
	const reqdata = req.body;
	
	const directorid = reqdata.ID_Director;
	let director;
	if (directorid) {
		const director_sql = `SELECT ID_Persona, nombre_completo, género, wikilink FROM PERSONAS WHERE ID_Persona=${directorid};`;
		let promisedirector = PromiseDBall(director_sql);
		director = await promisedirector;
		director = director[0];
		//console.log(director);
	} else {
		director = {ID_Persona:0, nombre_completo:"Desconocido", género: "ND", wikilink:null};
	}

	const sql_personas = `SELECT DISTINCT NUM.ID_Persona, PERSONAS.nombre_completo, PERSONAS.género, PERSONAS.wikilink
		FROM NUMREVISTA_PERSONA_RELACIÓN AS NUM
		JOIN PERSONAS ON (PERSONAS.ID_Persona = NUM.ID_Persona)
		WHERE ID_NumRevista = ${reqdata.ID_NumRevista};`
	let promisepersonas = PromiseDBall(sql_personas);
	const personas = await promisepersonas;
	var directorenpersonas=false;
	
	

	const sql_autores = `SELECT NUM.ID_Persona, OBRAS.ID_Obra
		FROM NUMREVISTA_PERSONA_RELACIÓN as NUM
		JOIN OBRAS ON (OBRAS.ID_Autor=NUM.ID_Persona)
		WHERE NUM.ID_NumRevista = ${reqdata.ID_NumRevista} AND NUM.TipoRelación = "autor obra" AND OBRAS.ID_Autor=NUM.ID_Persona AND OBRAS.ID_NumRevista = ${reqdata.ID_NumRevista};`;
	
	let promiseautores = PromiseDBall(sql_autores);
	const autores = await promiseautores;
	const autoresdic = {};
	for (const n in autores) {
		const autor = autores[n];
		const autorid = autor.ID_Persona;
		const obraid = autor.ID_Obra;
		if (autoresdic.hasOwnProperty(autorid)) {
			autoresdic[autorid]['Publicaciones'].push(obraid);

		} else {
			autoresdic[autorid] = {'Publicaciones': [obraid]};
		}

	}

	const sql_allautores = `SELECT DISTINCT ID_Autor FROM OBRAS;`;
	let promiseallautores = PromiseDBall(sql_allautores);
	const all_autores = await promiseallautores;
	const autores_list = [];
	for (const n in all_autores) {
		const id_autor = all_autores[n].ID_Autor;
		autores_list.push(id_autor);
	}
	//console.log(all_autores); 
	
	
	const sql_autsecciones = `SELECT NUM.ID_Persona, SECCIONES_PUBLICADAS.ID_SecciónPublicada
	FROM NUMREVISTA_PERSONA_RELACIÓN as NUM
	JOIN SECCIONES_PUBLICADAS ON (SECCIONES_PUBLICADAS.ID_Autor=NUM.ID_Persona)
	WHERE NUM.ID_NumRevista = ${reqdata.ID_NumRevista} AND NUM.TipoRelación = "autor sección" AND SECCIONES_PUBLICADAS.ID_Autor=NUM.ID_Persona AND SECCIONES_PUBLICADAS.ID_NumRevista = ${reqdata.ID_NumRevista};`
	let promiseautsecciones = PromiseDBall(sql_autsecciones);
	const autsecciones = await promiseautsecciones;

	for (const n in autsecciones) {
		const autor = autsecciones[n];
		const autorid = autor.ID_Persona;
		const seccionid = autor.ID_SecciónPublicada;
		if (autoresdic.hasOwnProperty(autorid)) {
			autoresdic[autorid]['Publicaciones'].push(seccionid);

		} else {
			autoresdic[autorid] = {'Publicaciones': [seccionid]};
		}

	}

	
	//console.log(autoresdic)

	const sql_colabs = `SELECT ID_Persona
	FROM NUMREVISTA_PERSONA_RELACIÓN 
	WHERE ID_NumRevista = ${reqdata.ID_NumRevista} AND TipoRelación = "colaborador general";`;
	let promisecolabs = PromiseDBall(sql_colabs);
	const colabs = await promisecolabs;
	const colabsid = [];
	for (const n in colabs) {
		colabsid.push(colabs[n].ID_Persona);
	}

	const personasids = [];
	const results = [];
	
	for (const n in personas) {
		const persona = personas[n]
		
		const persona_dic = {'ID_Persona':persona.ID_Persona, 'nombre': persona.nombre_completo, 'género': persona.género, 'image_url': persona.wikilink};
		if (autores_list.includes(persona.ID_Persona)) {
			persona_dic['tipo_persona'] = 'autor';
		} else {
			persona_dic['tipo_persona'] = 'colab_noautor';
		}
		
		//console.log(persona.ID_Persona, director.ID_Persona, persona.ID_Persona==director.ID_Persona);
		if (persona.ID_Persona==director.ID_Persona) {
			directorenpersonas=true;
			persona_dic['director']=true;
		} else {
			persona_dic['director'] = false;
		}
		if (autoresdic.hasOwnProperty(persona.ID_Persona) && colabsid.includes(persona.ID_Persona) ) {
			persona_dic['colab'] = true;
			persona_dic['autor'] = true;
			persona_dic['Publicaciones'] = autoresdic[persona.ID_Persona].Publicaciones;
		
		} else if (autoresdic.hasOwnProperty(persona.ID_Persona)) {
			persona_dic['colab'] = false;
			persona_dic['autor'] = true;
			persona_dic['Publicaciones'] = autoresdic[persona.ID_Persona].Publicaciones;
		} else if (colabsid.includes(persona.ID_Persona)) {
			persona_dic['colab'] = true;
			persona_dic['autor'] = false;
			persona_dic['Publicaciones'] = null;
		} else {
			console.log(`something not taken into account with person ${persona.ID_Persona}`);
		}
		personasids.push(persona.ID_Persona);

		
		results.push(persona_dic);
		
	}
	
	if (directorenpersonas==false) {
		const director_dic = {'ID_Persona':director.ID_Persona, 'nombre': director.nombre_completo, 'género': director.género, 'image_url': director.wikilink};
		director_dic['director']=true;
		director_dic['colab']=false;
		director_dic['autor']=false;
		director_dic['Publicaciones']=null;
		director_dic['tipo_persona']= 'desconocido';
		results.push(director_dic);
		personasids.push(director_dic.ID_Persona);

	}
	
	for (const n in results){
		const persona = results[n]
		const links = []; 
		const idp1 = results[n].ID_Persona;
		const personasids_include = "("+personasids.join(',')+")";
		//console.log(personasids_include);
		const afinidad_sql = `SELECT * FROM AFINIDADES_PERSONAS WHERE ID_Persona1 = ${idp1} AND ID_Persona2 IN ${personasids_include};`;
		let promiseafinidad = PromiseDBall(afinidad_sql);
		const afinidades = await promiseafinidad;
		if (afinidades.length>0){
			for (const n in afinidades) {
				const afinidad = afinidades[n];
				const idp2 = afinidad.ID_Persona2;
				const totalnum = afinidad.Total_NumComunes;
				const link = {'source': idp1, 'target': idp2, 'type': 'afinidad', 'value': totalnum};
				links.push(link);
				/*
				console.log('here', links.includes({ ID_Persona1: idp2, ID_Persona2: idp1, Total_NumComunes: totalnum }));
				if (links.includes({ ID_Persona1: idp2, ID_Persona2: idp1, Total_NumComunes: totalnum })==false){
					links.push(afinidad);
				}
				//console.log(afinidad);*/
			}
			
		}
		if (idp1!=director.ID_Persona) {
			console.log('here');
			const iddir = director.ID_Persona;
			if (iddir!=0) {
				const totalnum_dir_sql = `SELECT ID_NumRevista FROM NUMEROS_REVISTA WHERE ID_Director=${iddir};`
				let promisetotalnumdir = PromiseDBall(totalnum_dir_sql);
				var totalnum_dir = await promisetotalnumdir;
				totalnum_dir= totalnum_dir.length;
				const reldir_sql = `SELECT * FROM RELACIONES_DIRECTORES WHERE ID_Director = ${iddir} AND ID_Persona= ${idp1};`;
				let promisereldir = PromiseDBall(reldir_sql);
				const relsdir = await promisereldir;
				for (const n in relsdir) {
					const reldir = relsdir[n];
					const totalnum = reldir.Total_NumComunes;
					//console.log(reldir);

					if (persona['autor']==true){
						const link = {'source': iddir, 'target': idp1, 'type': 'autor', 'value': totalnum, 'totalnumdir':totalnum_dir};
						links.push(link);
					}
					if (persona.colab==true){
						const link = {'source': iddir, 'target': idp1, 'type': 'colab', 'value': totalnum, 'totalnumdir':totalnum_dir};
						links.push(link);
					}
				}

			} else {
				var totalnum_dir= 1;
				if (persona['autor']==true){
					const link = {'source': iddir, 'target': idp1, 'type': 'autor', 'value': 1, 'totalnumdir':totalnum_dir};
					links.push(link);
				}
				if (persona.colab==true){
					const link = {'source': iddir, 'target': idp1, 'type': 'colab', 'value': 1, 'totalnumdir':totalnum_dir};
					links.push(link);
				}
					
					
					
			}

		}
		
		results[n]['links']= links;
		//console.log(afinidad_sql)
		/*for (const idp2 in personasids){
			if (idp2!=idp1){
				let promiseafinidad = `SELECT * FROM AFINIDADES_PERSONAS WHERE ID_Persona`
			}
		}*/
		//console.log(results[n])
	}
	
	console.log(results);
	res.json({data:results});
});

app.post('/titulo', async (req, res) => {
	const id_pub = req.body.id_pub;
	console.log(id_pub, typeof(id_pub));
	let sql;
	if (typeof(id_pub)=='number') {
		sql = `SELECT Título_Sección, Título_Subsección FROM SECCIONES_PUBLICADAS WHERE ID_SecciónPublicada = ${id_pub};`;
		let promiseresults = PromiseDBall(sql);
		const results = await promiseresults;
		const result = results[0];
		if (result.Título_Subsección) {
			res.json({'título':  `Subsección <i>${result.Título_Subsección}</i> (Sección <i>${result.Título_Sección}</i>)` });
		} else {
			res.json({'título':  `Sección <i>${result.Título_Sección}</i>` });
		}
	} else {
		sql = `SELECT Título_Sección, Título_Subsección, Título_Obra FROM OBRAS WHERE ID_Obra = "${id_pub}";`;
		let promiseresults = PromiseDBall(sql);
		const results = await promiseresults;
		const result = results[0];
		if (result.Título_Sección && result.Título_Subsección && result.Título_Obra){
			res.json({'título':  `<i>${result.Título_Obra}</i> (en la sección <i>${result.Título_Sección}</i>, subsección <i>${result.Título_Subsección}</i>)` });
		} else if (result.Título_Sección && result.Título_Obra) {
			res.json({'título':  `<i>${result.Título_Obra}</i> (en la sección <i>${result.Título_Sección}</i>)` });
		} else {
			res.json({'título':  `<i>${result.Título_Obra}</i>` });
		}
		
	}
	
});