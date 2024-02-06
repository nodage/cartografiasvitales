let tab_id;
let current_url;
const noimageid_url = 'https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png';
let numeros_data;
let current_num;
let visumode;
let alldatarequired;

async function PingServer() {
    const url = 'ping/';
    const response = await fetch(url);
    const resjson = await response.json();
    const p_test = document.createElement('p');
    p_test.textContent = resjson.data;
    const divforp = document.getElementById('visualization-red-block');
    divforp.appendChild(p_test);
}

async function ReplaceURL(newurl) {
    await window.location.replace(newurl);
    //SetupChoice(newurl);
}

function ReactiveTabs(url_base) {
    const div_modules = document.getElementById('modules-block');
    for (const child of div_modules.children) {
        const tab_id = child.id;
        const tab_path = '/'+tab_id+'.html';
        const newUrl = url_base + tab_path;
        child.addEventListener('click', (event)=>{
            ReplaceURL(newUrl);
        });
        
    }
}

function defvisumode(afinidad, reldir){
    console.log('afinidad:', afinidad, 'reldir', reldir);
    if (afinidad == true && reldir == true) {
        visumode = "af_reldir";
    } else if (afinidad == false && reldir == false) {
        visumode = "simple";
    } else if (afinidad == false && reldir == true) {
        visumode = "reldir";
    } else if (afinidad == true && reldir == false) {
        visumode = "af";

    }
    UpdateNumero(current_num,visumode);

}

function setupRedVisuParams() {
    const div_params = document.getElementById("visuparams");
    if (document.getElementById("paramslist")){
        document.getElementById("paramslist").remove();
    }
    const paramslist_div = document.createElement('div');
    paramslist_div.setAttribute('id','paramslist');

    const cboxdiv_afinidad = document.createElement('div');
    cboxdiv_afinidad.setAttribute('class', 'paramdiv');

    const checkbox_afinidad = document.createElement('input');
    checkbox_afinidad.setAttribute('type', 'checkbox');
    checkbox_afinidad.setAttribute('id', 'cbox_afinidad');
    const lblcbox_afinidad = document.createElement('label');
    lblcbox_afinidad.setAttribute('for', 'cbox_afinidad');
    lblcbox_afinidad.textContent='Ver las afinidades entre las personas.';
    
    cboxdiv_afinidad.appendChild(checkbox_afinidad);
    cboxdiv_afinidad.appendChild(lblcbox_afinidad);
    paramslist_div.appendChild(cboxdiv_afinidad);

    const cboxdiv_reldir = document.createElement('div');
    cboxdiv_reldir.setAttribute('class', 'paramdiv');

    const checkbox_reldir = document.createElement('input');
    checkbox_reldir.setAttribute('type', 'checkbox');
    checkbox_reldir.setAttribute('id', 'cbox_reldir');
    const lblcbox_reldir = document.createElement('label');
    lblcbox_reldir.setAttribute('for', 'cbox_reldir');
    lblcbox_reldir.textContent= 'Posicionar a las personas en función de su afinidad con la dirección del número.';

    cboxdiv_reldir.appendChild(checkbox_reldir);
    cboxdiv_reldir.appendChild(lblcbox_reldir);
    paramslist_div.appendChild(cboxdiv_reldir);

    div_params.append(paramslist_div);

    document.getElementById('cbox_afinidad').addEventListener('change',(event)=>{
        const cbox_af = document.getElementById('cbox_afinidad');
        const cbox_rd = document.getElementById('cbox_reldir');
        defvisumode(cbox_af.checked, cbox_rd.checked);
    });
    document.getElementById('cbox_reldir').addEventListener('change',(event)=>{
        const cbox_af = document.getElementById('cbox_afinidad');
        const cbox_rd = document.getElementById('cbox_reldir');
        defvisumode(cbox_af.checked, cbox_rd.checked);
    });

}
function MakeLinks(datalinks, visumode) {
	return new Promise((resolve, reject)=> {
        var links=[];
		if (visumode== "simple"||visumode=="reldir"){
            Array.from(datalinks).forEach( (link)=>{
                if (link.type=='autor'||link.type=='colab'){
                    links.push(link);
                }
            });
            
        } else if (visumode == 'af'||visumode=='af_reldir'){
            links = datalinks;
    
        }
        resolve(links);
        reject('error');
	});
}

async function redvisulight(data, visudivid, visumode){
    console.log('here, right?');
    visudiv = document.getElementById(visudivid);
    let width = visudiv.offsetWidth;
    let height = visudiv.offsetHeight; 
    let promiselinks = MakeLinks(data.links, visumode);
    var links = await promiselinks;
    console.log(links);
    const nodes = data.nodes;
    let zoom = d3.zoom()
        .on('zoom', handleZoom);
    
    const svg = d3.select('#d3visu')
    .append('svg')
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;")
    .append('defs')
    .selectAll('.pattern')
    .data(data.patterns)
    .join(function(enter){
        return enter
            .append('pattern')
            .attr('id', function(d){return d.id})
            .attr('class', 'pattern')
            .attr('width', "100%")
            .attr('height', "100%")
            .attr('patternContentUnits', 'objectBoundingBox')
            .append('image')
            .attr('width', 1)
            .attr('height', 1)
            .attr('preserveAspectRatio', 'none')
            .attr('href', function(d){return d['href']});
        }, function(update){
            return update;
        }, function(exit){
            return exit;
        });
    
    let simulation;
    if (visumode == 'simple'||visumode=='af'){
        simulation = d3.forceSimulation(nodes)
                        .force("link", d3.forceLink(links).id(d=>d.id).strength(0.02))
                        .force("charge", d3.forceManyBody().strength(-400))
                        .force("center", d3.forceCenter(width/2, height/2));

    } else {
        simulation = d3.forceSimulation(nodes)
                        //.force("link", d3.forceLink(links).id(d=>d.id).strength(0.02))
                        .force("link", d3.forceLink(links).id(d=>d.id).distance(function(d){if(d.type=='afinidad'){
                                return 200
                            } else {
                                return 300 +(1- d.value/d.totalnumdir)*300
                            }
                        }))
                        .force("charge", d3.forceManyBody().strength(-400))
                        .force("center", d3.forceCenter(width/2, height/2));
    }
    /*const simulation = d3.forceSimulation(nodes)
                    .force("link", d3.forceLink(links).id(d=>d.id).strength(0.02))
                    .force("charge", d3.forceManyBody().strength(-400))
                    .force("center", d3.forceCenter(width/2, height/2));*/

    

    const link = d3.select('#d3visu')
        .select('svg')
        .append("g")
        
        //.attr("stroke", "#999")
        //.attr("stroke-opacity", 0.6)
        .selectAll(".line")
        .data(links)
        //.enter()
        //.append("line")//
        .join(function(enter) {
            return enter
                .append('line')
                .attr("stroke", function(d){
                    if (d.type=='autor') {
                        return "#eb8b05"

                    } else if (d.type == 'colab'){
                        return "#FFFFFF"
                    } else if (d.type=='afinidad'){
                        return "#d7f01f"

                    }else {
                        return "#FFFFFF"
                    }
                })
                .style('stroke-dasharray',function(d){
                    if (d.type=='autor') {
                        return 0

                    } else if (d.type == 'colab'){
                        return 5
                    } else {
                        return 0
                    }

                }) 
                .attr('class', 'line')
                .attr("stroke-width", 3);
            },
            function(update) {
                return update;
            },
            function(exit) {
                return exit
                    .transition()
                    .attr("stroke-width",3)
                    .remove();
            });
    
    const node = d3.select('#d3visu')
        .select('svg')
        .select("g")
        .selectAll(".node")
        .data(nodes)
        .join("g")
        .attr('class', 'node')
        .append("circle")
            .attr("stroke", function(d){
                if (d.tipo_persona=='autor') {
                    return "#eb8b05"

                } else if (d.tipo_persona == 'colab_noautor'){
                    return "#FFFFFF"
                } else {
                    return "#FFFFFF"
                }
            })
            .attr("stroke-width", 3)
            .attr('class', 'circle')
            .attr('id', function(d){d.id})
            //.attr("r", 30)
            .attr("r", function(d){
                if(d.Publicaciones==null) {
                    return 30;
                } else {
                    return 30 + d.Publicaciones.length*3;
                }
            })
            .style("fill", d=> "url(#image"+d.id.toString()+")");
    
        
    d3.selectAll(".node")
        .each(function(d){
            d3.select(this)
            .on("mouseenter", (event)=>{
                d3.select(this)
                .select('circle')
                .style("fill", "blue")
                d3.select(this)
                .append('text')
                .style('fill', "#FFFFFF")
                .style('font-weight', 'bold')
                .attr("transform", function(d){return "translate("+d.x+","+d.y+")"})
                .text(function(d){ return d.nombre})
            })
            .on('mouseleave', (event)=>{
                d3.select(this)
                .select('circle')
                .style("fill", d=> "url(#image"+d.id.toString()+")")
                .attr("r", function(d){
                    if(d.Publicaciones==null) {
                        return 30;
                    } else {
                        return 30 + d.Publicaciones.length*3;
                    }
                });
                d3.select(this)
                .select('text')
                .remove();


            })
            .on('click', (event)=>{
                d3.select(this)
                .select('circle')
                .style("fill", d=> "url(#image"+d.id.toString()+")")
                .attr("r", function(d){
                    if(d.Publicaciones==null) {
                        return 60;
                    } else {
                        return 60 + d.Publicaciones.length*3;
                    }
                });
                

            })
        }) 
        

    d3.selectAll(".node")
        .selectAll('title')
        .remove()
        
                                
    d3.selectAll(".node")
        .append("title")
        .text(d => d.nombre);                      
        
    d3.selectAll('.node').call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
        
    d3.select('svg')
        .call(zoom);
        
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
    
        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
        });
    
    function handleZoom(e) {
        d3.select('svg g')
        .attr('transform', e.transform);
    }
    
    

    // Reheat the simulation when drag starts, and fix the subject position.
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.9).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    
    // Update the subject (dragged node) position during drag.
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    
    // Restore the target alpha so the simulation cools after dragging ends.
    // Unfix the subject position now that it’s no longer being dragged.
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    } 
}

async function redvisu(data, visudivid, visumode){
    console.log(alldatarequired);
    if (alldatarequired==true){
        console.log('supposed to be redirected');
        redvisulight(data,visudivid,visumode);
    } else {
        visudiv = document.getElementById(visudivid);
        let width = visudiv.offsetWidth;
        let height = visudiv.offsetHeight; 
        let promiselinks = MakeLinks(data.links, visumode);
        var links = await promiselinks;
        console.log(links);
        //console.log(width, height);

        
        const nodes = data.nodes;
        let zoom = d3.zoom()
            .on('zoom', handleZoom);
        
        const svg = d3.select('#d3visu')
        .append('svg')
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;")
        .append('defs')
        .selectAll('.pattern')
        .data(data.patterns)
        .join(function(enter){
            return enter
                .append('pattern')
                .attr('id', function(d){return d.id})
                .attr('class', 'pattern')
                .attr('width', "100%")
                .attr('height', "100%")
                .attr('patternContentUnits', 'objectBoundingBox')
                .append('image')
                .attr('width', 1)
                .attr('height', 1)
                .attr('preserveAspectRatio', 'none')
                .attr('href', function(d){return d['href']});
        }, function(update){
            return update;
        }, function(exit){
            return exit;
        })
        //.enter()
        //.append("pattern")
        //.join('pattern')
            
        
        var Tooltip = d3.select("#d3visu")
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px");
        
        let simulation;
        if (visumode == 'simple'||visumode=='af'){
            simulation = d3.forceSimulation(nodes)
                            .force("link", d3.forceLink(links).id(d=>d.id).strength(0.02))
                            .force("charge", d3.forceManyBody().strength(-300))
                            .force("center", d3.forceCenter(width/2, height/2));

        } else {
            simulation = d3.forceSimulation(nodes)
                            //.force("link", d3.forceLink(links).id(d=>d.id).strength(0.02))
                            .force("link", d3.forceLink(links).id(d=>d.id).distance(function(d){if(d.type=='afinidad'){
                                    return 150
                                } else {
                                    return 200 +(1- d.value/d.totalnumdir)*200
                                }
                            }))
                            .force("charge", d3.forceManyBody().strength(-300))
                            .force("center", d3.forceCenter(width/2, height/2));
        }
        
        
                            //.force('collision', d3.forceCollide().radius(function(d){return d.r}));
                            //;
                            
        
        
        const link = d3.select('#d3visu')
                        .select('svg')
                        .append("g")
                        
                        //.attr("stroke", "#999")
                        //.attr("stroke-opacity", 0.6)
                        .selectAll(".line")
                        .data(links)
                        //.enter()
                        //.append("line")//
                        .join(function(enter) {
                            return enter
                                .append('line')
                                .attr("stroke", function(d){
                                    if (d.type=='autor') {
                                        return "#eb8b05"

                                    } else if (d.type == 'colab'){
                                        return "#FFFFFF"
                                    } else if (d.type=='afinidad'){
                                        return "#d7f01f"

                                    }else {
                                        return "#FFFFFF"
                                    }
                                })
                                .style('stroke-dasharray',function(d){
                                    if (d.type=='autor') {
                                        return 0
        
                                    } else if (d.type == 'colab'){
                                        return 5
                                    } else {
                                        return 0
                                    }

                                }) 
                                .attr('class', 'line')
                                .attr("stroke-width", 3);
                            },
                            function(update) {
                                return update;
                            },
                            function(exit) {
                                return exit
                                    .transition()
                                    .attr("stroke-width",3)
                                    .remove();
                            })
                        /*.join('line')
                            .attr('class', 'line')
                            .attr("stroke-width", 1.5);*/
        

        /*const zoomRect = d3.select('#d3visu')
            .select('svg')
            .append("rect")
            .attr("width", width)
            .attr("height", height)
            .style("fill", "none")
            .style("pointer-events", "all")*/
        
        const node = d3.select('#d3visu')
                        .select('svg')
                        .select("g")
                        .selectAll(".node")
                        .data(nodes)
                        //.enter()
                        //.append("g")
                        .join(function(enter) {
                            return enter
                                .append('g')
                                .attr('class', 'node')
                                .append("circle")
                                    .attr("stroke", function(d){
                                        if (d.tipo_persona=='autor') {
                                            return "#eb8b05"

                                        } else if (d.tipo_persona == 'colab_noautor'){
                                            return "#FFFFFF"
                                        } else {
                                            return "#FFFFFF"
                                        }
                                    })
                                    .attr("stroke-width", 3)
                                    .attr('class', 'circle')
                                    .attr('id', function(d){d.id})
                                    .attr("r", function(d){
                                        if(d.Publicaciones==null) {
                                            return 40;
                                        } else {
                                            return 40 + d.Publicaciones.length*15;
                                        }
                                    })
                                    .style("fill", d=> "url(#image"+d.id.toString()+")");
                        }, function(update) {
                            return update;
                        }, function(exit) {
                            return exit
                                .transition()
                                .attr('cy', 500)
                                .remove()
                        }) 
                        /*.join('g')
                            .attr('class', 'node')
                            .append("circle")
                            .attr('class', 'circle')
                            .attr('id', function(d){d.id})
                            .attr("r", 40)
                            .style("fill", d=> "url(#image"+d.id.toString()+")")
                            ;*/

                        
        d3.selectAll(".node")
        .each(function(d){
            d3.select(this)
            .on("mouseenter", (event)=>{
                d3.select(this)
                .select('circle')
                .style("fill", "blue")
                d3.select(this)
                .append('text')
                .style('fill', "#FFFFFF")
                .style('font-weight', 'bold')
                .attr("transform", function(d){return "translate("+d.x+","+d.y+")"})
                .text(function(d){ return d.nombre})
            })
            .on('mouseleave', (event)=>{
                d3.select(this)
                .select('circle')
                .style("fill", d=> "url(#image"+d.id.toString()+")")
                .attr("r", function(d){
                    if(d.Publicaciones==null) {
                        return 40;
                    } else {
                        return 40 + d.Publicaciones.length*15;
                    }
                });
                d3.select(this)
                .select('text')
                .remove();
                Tooltip.style("opacity", 0);
                /*d3.select(this)
                .select('circle')
                .select('div')
                .style("visibility", "hidden");*/


            })
            .on('click', (event)=>{
                d3.select(this)
                .select('circle')
                .style("fill", d=> "url(#image"+d.id.toString()+")")
                .attr("r", function(d){
                    if(d.Publicaciones==null) {
                        return 80;
                    } else {
                        return 80 + d.Publicaciones.length*15;
                    }
                    })
                .on('click', (event)=>{
                    
                    Tooltip
                    .style("opacity", 1)
                    .style("top", d.cy + "px")
                    .style("left", d.cx + "px")
                    .html(function(){return d.tooltip})
                    
                })
                

            })
        }) 
        
    
        d3.selectAll(".node")
        .selectAll('title')
        .remove()
        
                                
        d3.selectAll(".node")
        .append("title")
        .text(d => d.nombre);                      
        
        /*const zoom = d3.zoom()
        .scaleExtent([1/2, 64])
        .on("zoom", zoomed);
    
        zoomRect.call(zoom)
            .call(zoom.translateTo, 0, 0);*/
        
        d3.selectAll('.node').call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
        
        d3.select('svg')
        .call(zoom);
        
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
        
            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
            });
        /*d3.select('#d3visu')
        .select('svg')
        .select('defs')
        .selectAll('*')
        .remove()*/
        function handleZoom(e) {
            d3.select('svg g')
            .attr('transform', e.transform);
        }
        
        

        // Reheat the simulation when drag starts, and fix the subject position.
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.9).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        // Update the subject (dragged node) position during drag.
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        // Restore the target alpha so the simulation cools after dragging ends.
        // Unfix the subject position now that it’s no longer being dragged.
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

    }
    
    
    /*    // When this cell is re-run, stop the previous simulation. (This doesn’t
        // really matter since the target alpha is zero and the simulation will
        // stop naturally, but it’s a good practice.)RedData
        invalidation.then(() => simulation.stop());
      
        return svg.node();
      }*/
}

async function SetUrlBase() {
    const currentUrl = window.location.href;
    const url_parsing = new URL(currentUrl);
    const url_base = url_parsing.protocol +'//'+ url_parsing.host;
    await ReactiveTabs(url_base);

}

async function RedData(datanum) {
    console.log(datanum);
    let personas;
    if (datanum == 'all'){
        alldatarequired=true;
        const response = await fetch('reddataallnum/');
        const resjson = await response.json();
        personas = resjson.data;
        //console.log('all is to be configured...');
    } else {
        alldatarequired=false;
        const url = 'reddatanum/';
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                },
            body: JSON.stringify(datanum)
        };
        const response = await fetch(url, options);
        const resjson = await response.json();
        personas = resjson.data;
    }
    console.log(personas)
    const links = [];
    const patterns_data = [];
    const personas_nodes = [];
    //var idlink = 0;
    for (const n in personas) {
        const persona = personas[n];
        const personaid = persona.ID_Persona+1;
        persona_node = {'id': personaid, 'ID_Persona':persona.ID_Persona, 'nombre': persona.nombre, 'género': persona.género, 'image_url': persona.image_url, 'tipo_persona': persona.tipo_persona, 'director':persona.director, 'colab':persona.colab, 'autor':persona.autor, 'Publicaciones': persona.Publicaciones};     
        
        if (persona.image_url==null){
            persona_node.image_url = noimageid_url;
        }
        //personas[n]['id']= personaid;
        console.log(alldatarequired);
        if (alldatarequired==false){
            if (persona.Publicaciones==null) {
                persona_node.tooltip= '<p>No hay publicación.</p>';
    
            } else {
                const títulos = [];
                for (const n in persona.Publicaciones) {
                    const id_pub = {'id_pub': persona.Publicaciones[n]};
                    const url_título = 'titulo/';
                    //console.log(id_pub);
                    const options = {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                            },
                        body: JSON.stringify(id_pub)
                    };
                    const response = await fetch(url_título, options);
                    const resjson = await response.json();
                    const título = resjson.título;
                    títulos.push(título);
    
                }
                //console.log(títulos);
                var tooltip = `<p>Publicaciones:`;
                for (const n in títulos) {
                    //console.log(títulos[n]);
                    //tooltip += `\n<span>${títulos[n].toString()}</span>`;
                    tooltip += `\n${títulos[n].toString()}`;
                }
                //personas[n].tooltip = tooltip + '</p>'; 
                persona_node.tooltip = tooltip + '</p>'; 
            }
        }
        
        patterns_data.push({'id':'image'+personaid.toString(), 'href': persona_node.image_url});
        for (const n in persona.links){
            const link = persona.links[n];
            //console.log(link);
            const new_link = link;
            new_link.source = link.source +1;
            new_link.target = link.target +1;
            //console.log(new_link);
            links.push(new_link);
        }
        personas_nodes.push(persona_node);
    }
    console.log(patterns_data);
    //console.log(personas);
    //console.log(links);
    const reddata = {'nodes': personas_nodes, 'links': links, 'patterns': patterns_data} 
    //console.log(reddata);
    return reddata;


    
}
    
async function UpdateNumero(current_num, visumode) {
    const datanum = await RedData(current_num);
    d3.select('#d3visu')
        .select('svg')
        .remove()
    d3.selectAll('.pattern')
      .remove()
    d3.select('.tooltip')
      .remove()
    redvisu(datanum, "d3visu", visumode);
}
async function setupred() {
    tab_id = 'red-tab';
    SetUrlBase();
    console.log('you are setting up red-tab.');
    const visu_div = document.getElementById("red-visualization");
    const d3visu_div = document.createElement("div");
    d3visu_div.setAttribute("id", "d3visu");
    d3visu_div.setAttribute("class", "d3visu");
    const visuparams_div = document.createElement("div");
    visuparams_div.setAttribute("id", "visuparams");
    visuparams_div.setAttribute("class", "visuparams");
    const label_red = document.createElement('div');
    label_red.setAttribute('id', 'labelnum');
    visuparams_div.appendChild(label_red);

    
    
    

    /*get números de revista con datos (¡no todos tienen director registrado!)*/
    const url = 'numswithdata/';
    const response = await fetch(url);
    const resjson = await response.json();
    numeros_data = resjson.data;
    
    console.log(numeros_data);
    var numeros_bar = document.createElement('input');
    numeros_bar.setAttribute('type', 'range');
    numeros_bar.setAttribute('id', "numero_barra");
    numeros_bar.setAttribute('min', 1);
    numeros_bar.setAttribute('list', "numeros_list" );
    var numeroslist = document.createElement('datalist');
    numeroslist.setAttribute('id', "numeros_list");
    var n = 1;
    Array.from(numeros_data).forEach((item) => {
        var item_opt = document.createElement('option');
        item_opt.value = n;
        //item_opt.value = item.ID_NumRevista;
        item_opt.textContent = item.Título_Revista + ' número ' +item.Número + ', ' + item.Fecha + ', ' + item.Lugar_Publicación;
        numeroslist.appendChild(item_opt);
        n+=1
        console.log(item_opt.value);
    });

    //to add all
    var opt_all = document.createElement('option');
    opt_all.value = 41;
    opt_all.textContent = 'Todos los números de La Caprichosa.';
    numeroslist.appendChild(opt_all);
    numeros_data.push('all');


    numeros_bar.setAttribute('max', numeros_data.length);
    numeros_bar.setAttribute('step', 1);
    d3visu_div.appendChild(numeros_bar);
    d3visu_div.append(numeroslist);
    
    visu_div.appendChild(d3visu_div);
    visu_div.appendChild(visuparams_div);
    current_num = numeros_data[0];
    const datanum = await RedData(current_num); 
    //document.getElementById('labelnum').content = numeroslist[current_num];
    const numeros_data_dic = {};
   /* n = 1;
    Array.from(numeros_data).forEach(datanum=>{
        console.log(n, datanum);
        if (datanum =='all') { //to add all
            numeros_data_dic[datanum]= n;
        }else {
            numeros_data_dic[datanum.ID_NumRevista]= n;
        }
        
        n+=1;
        
    });*/
    
    document.getElementById('numero_barra').value = 1;
    Array.from(document.getElementById('numeros_list').getElementsByTagName('option')).forEach((opt) => {
        //console.log(opt.value);
        //console.log(document.getElementById('numero_barra').value);
        if (document.getElementById('numero_barra').value==opt.value) {
            document.getElementById('labelnum').textContent = opt.text;
            //console.log(opt.text);
        }  
    });
    visumode = 'simple';
    document.getElementById('numero_barra').addEventListener("change", (event)=>{
        console.log(document.getElementById('numero_barra').value)
        current_num = numeros_data[document.getElementById('numero_barra').value-1];
        //console.log(document.getElementById('numero_barra').textContent);
        Array.from(document.getElementById('numeros_list').getElementsByTagName('option')).forEach((opt) => {
            //console.log(opt.value);
            if (document.getElementById('numero_barra').value==opt.value) {
                document.getElementById('labelnum').textContent = opt.text;
                //console.log(opt.text);
            }  
        });
        UpdateNumero(current_num, visumode);
    });
    
    redvisu(datanum, "d3visu",visumode);
    setupRedVisuParams();
       


}

async function setupdistribuciones() {
    console.log('you are setting up distribuciones-tab.');
    tab_id = 'distribuciones-tab';
    SetUrlBase();
}

async function setupcontenidos() {
    console.log('you are setting up contenidos-tab.');
    tab_id = 'contenidos-tab';
    SetUrlBase();
}
async function SetupChoice(current_url) {
    console.log('you are in setup choice');
    console.log(current_url);
    if (current_url.endsWith('red-tab.html')){
        setupred();
    } else if (current_url.endsWith('distribuciones-tab.html')) {
        setupdistribuciones();
    } else if (current_url.endsWith('contenidos-tab.html')) {
        setupcontenidos();
    }
}

async function setup() {
    tab_id = "home-tab";
    SetUrlBase();
    
    //PingServer();
}

const loading_url = window.location.href;
//console.log(loading_url);
if (loading_url.endsWith('/')){
    setup()
} else {
    SetupChoice(loading_url);
}
