const fs = require("fs");
const http = require("http");
const path = require("path");
const PORT = 8000;
const ICON_PATH = path.join(process.cwd(), "./favicon.ico");
const MIME_TYPES = {
    default: "application/octet-stream",
    html: "text/html; charset=UTF-8",
    js: "application/javascript",
    css: "text/css",
    png: "image/png",
    jpg: "image/jpg",
    gif: "image/gif",
    ico: "image/x-icon",
    svg: "image/svg+xml",
};
const PATH = process.cwd();
const STATIC_PATH = path.join(PATH, "./static");
const ERROR_PATH = path.join(STATIC_PATH, "./404.html");

const toBool = [() => true, () => false];
let working_path = [path.join(STATIC_PATH, '/')];
const list_files = async (dir) => {
    working_path += '/'+dir.end+'/';
    let x = [];
    if (await fs.promises.access(dir).then(...toBool)){
        const content = fs.readdirSync(dir);
        for (let i = 0; i < content.length; i++) {
            let is_directory = fs.lstatSync(`${dir}/${content[i]}`).isDirectory();
            let res = [content[i], is_directory];
            x.push(res)
        }
    }

    return x;
}
const find_your_parents = (dir_disassembled) =>{
    let parental_tree_of_madness = '';
    let idx = -1;
    for (let i = dir_disassembled.length-1; i > 0 ; i--) {
        if (dir_disassembled.at(i) === 'static') {
            idx = i;
            break;p
        }
    }
    for (let i = idx; i < dir_disassembled.length-1; i++) {
        parental_tree_of_madness += '/'+dir_disassembled[i];
    }
    parental_tree_of_madness+='';
    console.log(parental_tree_of_madness);
    return parental_tree_of_madness;
}
async function build_html (dir, dbg){
    console.log(dbg);
    console.log("listing directory" + dir);

    let files = await list_files(dir);
    let split = dir.split('/');
    if (split.at(split.length-1) === "") split.pop();
    let parent = find_your_parents(split);
    let this_dir = split.at(split.length - 1);
    let top = this_dir === 'static';
    let this_path='/';
    let reading= false;
    for (let i = 0 ; i < split.length ; i++) {
        if (split.at(i) === 'static') reading = true;
        if (reading) this_path+=split.at(i)+'/';
    }


    let header = ''
    let body = (top) ? '' : '<a href="'+parent+'" id="back-arrow">←</a>';

    if (files.length === 0) body +="<h1> EMPTY </h1> <br>"
    for (const file of files) {
        let file_info = fs.statSync(dir+file[0]);
        let file_size = file_info.size / (1000);
        body += (file[1]) ? '<h2>'+file[0] + 'Size: ' + file_size + 'kb <a href="'+this_path+file[0]+'">></a> <br></h2>': '<h2>'+file[0] + 'Size: ' + file_size + 'kb <a  href="'+this_path+file[0]+'"><img src="download.png" style="width:16px;height:16px;"alt="Download"></a></h2>';
    }

    return "<!DOCTYPE html>\n" +
        "<html lang=\"en\">"
        + header + body + dbg + "</html>";

}
const prepareFile = (url) => {
    const ext = path.extname(url).substring(1).toLowerCase();
    const stream = fs.createReadStream(url);
    return {ext, stream };
};
const serve_icon = (response) =>{
    response.writeHead(200, { "Content-Type": MIME_TYPES.ico});
    fs.createReadStream(ICON_PATH).pipe(response);
}
const serve_404 = (response) =>{
    response.writeHead(404, { "Content-Type": MIME_TYPES.html});
    fs.createReadStream(ERROR_PATH).pipe(response);
}
http
    .createServer(async (req, res) => {
        let url = req.url;
        if (url === '/') url = '/static/'
        let debug = [];
        let favicon = url === ("/favicon.ico");
        let sys_path = path.join(PATH,url);
        let exist = await fs.promises.access(sys_path).then(...toBool);
        if(favicon){
            serve_icon(res);
        }
        else if (exist) {
            let is_directory = fs.lstatSync(sys_path).isDirectory();
            debug+=(req.headers.host + '\: GET ' + sys_path + '<br>' );
            debug+=(sys_path + ' - is directory? '+is_directory+'\n');
            if (is_directory) {
                let html = await build_html(sys_path, debug);
                res.writeHead(200, {"Content-Type": MIME_TYPES.html});
                res.end(html);
            }
            else{
                const file = prepareFile(path.join(PATH,url));
                res.writeHead(200, { "Content-Type": MIME_TYPES.default});
                file.stream.pipe(res);
                console.log(`${req.method} ${req.url}`);
            }

        }
        else{
            console.log("Failed to find " + sys_path)
            serve_404(res);
        }
    })
    .listen(PORT);

console.log(`Server running at http://127.0.0.1:${PORT}/`);
