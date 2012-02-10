var AutodafePart = global.autodafe.AutodafePart;
var ClassElement = require( './class_element.js');

module.exports = Class.inherits( AutodafePart );

function Class( params ){
  return this._init( params );
}

Class.prototype._init = function( params ){
  Class.parent._init.call( this, params );
  this.re = {
      // jsdoc tags
      author: /@author\s+(.*)/i,
      version: /@version\s+(.*)/i,
      constructor: /@constructor/i,
      deprecated: /@deprecated/i,
      event: /@event/i,
      method: /@(method|function)/i,
      name: /@name\s+(.+?)@/i,
      memberOf: /@this\s+(.*)/i,
      param: /@param\s+{(.*?)}\s+(.+?)\s+(.*?)@/ig,
      property: /@property\s+{(\w+)}\s+(.+?)\s+(.*?)@/ig,
      returns: /@returns\s+{(\w+)}\s+(.*?)@/i,
      privacy: /@(public|private|protected)/i,
      static: /@static/i,
      method_throws: /@throws\s+{(\w*)}\s+(.*?)@/i,
      extends: /@(extends|augments)\s+(.*?)\s+/i,
      type: /@(type)\s+{(\w+)}/i,
      example : /@example\s+(.*?)$/i,
      description : /@description/i,
      see : /@see\s+(.+?)@/ig
      };
  
  this.path = params.path || 'Файл не определен';
  this.className = '';
  this.methods   = [];
  this.properties = [];
  this.events    = [];
  this.description = '';

  this._.short_description = '';
  this._.short_description.get = function(){
    return Array.isArray( this.description ) ? this.description[ 0 ] : this.description;
  };

  this._.short_path = '';
  this._.short_path.get = function(){
    var tmp = this.path.split( '/autodafe/' );
    return tmp[ 1 ] ? 'autodafe/' + tmp[ 1 ] : this.path;
  }

  if( params.blocks && params.blocks.length ) this.parse_blocks( params.blocks );
  this.check_prop_lengths();
  this.constructor = this.get_element_by_name( this.className, 'methods' )[0];

  return this;
}

Class.prototype.check_prop_lengths = function( str, block ){
  if( this.methods.length == 0 ) this.methods = null;
  if( this.properties.length == 0 ) this.properties = null;
  if( this.events.length == 0 ) this.events = null;
}

Class.prototype.check = function( str, block ){
  if( typeof block == 'string' ) return this.re[ str ].test( block );
  return this.re[ str ].test( block.comment ) || this.re[ str ].test( block.source )
}

Class.prototype.is_method = function( block ){
  if( this.check( 'method', block.comment.join('') ) ) return true;
  for (var i = 0, ln_i = block.source.length; i < ln_i; i++)
    if( block.source[ i ] != '' ) return /function/.test( block.source[ i ] )
}
    
Class.prototype.get_element_by_name = function( name, type ){
  for (var i = 0, ln_i = this[ type ].length; i < ln_i; i++) {
    if( this[ type ][ i ].name == name ) return this[ type ].splice( i, 1 );
  }
  return null;
}

Class.prototype.parse_blocks = function( blocks ){
  for (var i = 0, ln_i = blocks.length; i < ln_i; i++) {
  //if( this.check( 'author', block.comment ) || this.check ( 'version', block.comment ) ) return this.parse_head();
    if( this.is_method( blocks[ i ] ) )
      this.parse_method( blocks[ i ] );
    else if( this.re.event.test( blocks[ i ].comment.join('') ) )
          this.parse_event( blocks[ i ] );
        else
          this.parse_property( blocks[ i ] );
  }
}
// --------------------- EVENTS ------------------------------

Class.prototype.parse_event = function( block ){
  var comment = block.comment.join(' ');
  this.events.push( new ClassElement({
    name : this.get_name( comment ),
    description : this.get_description( block.comment, 'description' ),
    example     : this.get_example( block.comment, 'example' )
  }))
}

// --------------------- PROPERTIES ------------------------------

Class.prototype.parse_property = function( block ){
  var comment = block.comment.join(' ');
  var name = this.get_name( comment );
  if( !name ) name = this.extract_property_name( block.source.join('') );
//  this.properties[ name ] =  new Property({
  this.properties.push( new ClassElement({
    name        : name,
    static      : this.check( 'static', comment ),
    privacy     : this.get_privacy( comment ),
    description : this.get_description( block.comment ),
    properties  : this.get_params( 'property', comment ),
    example     : this.get_example( block.comment, 'example' ),
    type        : this.get_single_field( 'type', comment )
  }))
}

Class.prototype.extract_property_name = function( source ){
  var result = /(.+?).(\w+)\s*=/i.exec( source );
  return result ? result[ 2 ] : '';
}


// --------------------- METHODS ------------------------------

Class.prototype.parse_method = function( block ){
  var comment = block.comment.join(' ');

  var name = this.get_name( comment );
  if( !name ) name = this.extract_method_name( block.source[0] );
  var description = this.get_description( block.comment );
  if( this.check( 'constructor', comment ) ){
    this.className = name;
    this.description = description;
    var ext = this.get_single_field( 'extends', comment )
  }
  //this.methods[ name ] = new Method({
  this.methods.push( new ClassElement({
    name          : name,
    params        : this.get_params( 'param', comment ),
    returns       : this.get_type_descr( 'returns', comment ),
    method_throws : this.get_type_descr( 'method_throws', comment ),
    privacy       : this.get_privacy( comment ),
    static        : this.check( 'static', comment ),
    description   : description,
    example       : this.get_example( block.comment, 'example' ),
    properties    : this.get_params( 'property', comment ),
    extends       : ext,
    see           : this.get_params( 'see', comment )
  }))
}

Class.prototype.get_params = function( tag, comment ){
  var result,arr = [];
  while( (result = this.re[ tag ].exec( comment ) ) != null ){
    arr.push({
      type : result[ 1 ] ? result[ 1 ].trim() : null,
      name : result[ 2 ] ? result[ 2 ].trim() : null,
      //description : this.get_description( result[ 3 ] )
      description : result[ 3 ]
    } )
  this.re[tag].lastIndex = result[ 0 ].length + result.index - 1;
}
  return arr.length ? arr : null;
}

Class.prototype.get_name = function( comment ){
  var result = this.re.name.exec( comment );
//  return  result ? this.get_description( result[ 1 ] ) : null;
  return  result ? result[ 1 ] : null;
}

Class.prototype.extract_method_name = function( source ){
  var result = /(.*)function\s*(\w*)/i.exec( source );
  if( result ){
    if( result[ 2 ] != '' ) return result[ 2 ].replace( ' ', '' );
    result = /\.(\w+)(\s|=)/i.exec( result[ 1 ]);
    return result ? result[ 1 ] : '';
  }
  return '';
}

Class.prototype.get_type_descr = function( tag, comment ){
  var result = this.re[ tag ].exec( comment );
  return  result ? {
    type : result[ 1 ],
    //description : this.get_description( result[ 2 ] )
    description : result[ 2 ]
  } : '';
}

Class.prototype.get_description = function( comment, tag ){
  var index = 0,
      ln = comment.length,
      result = [],
      line = '';
  if( tag ){
    index = this._get_line_index_by_tag( comment, tag );
    if( index == ln ) return null;
    line = comment[ index ].replace( '@' + tag, '');
    index++;
  }
  while( index < ln ){
    if( /@/.test( comment[ index ] ) || index == ln-1 ){
      result.push( line );
      return result;
    }
    if( comment[ index ] == '' && index > 0 ){
      result.push( line );
      line = '';
    } else line += ( comment[ index ] + ' ' );
    index++;
  }
  result.push( line );
  return result;
}

Class.prototype.get_example = function( comment, tag ){
  var index = 0,
      ln = comment.length,
      result = [];
  if( tag ){
    index = this._get_line_index_by_tag( comment, tag );
    if( index == ln ) return null;
    result.push( comment[ index ].replace( '@' + tag, '') );
    index++;
  }
  while( index < ln ){
    if( /@/.test( comment[ index ] ) || index == ln-1 ) return result;
    result.push( comment[ index ] );
    index++;
  }
  return result;
}

Class.prototype.get_single_field = function( tag, comment ){
  var result = this.re[ tag ].exec( comment );
  //return result ? this.get_description( result[ 2 ] ) : null;
  return result ? result[ 2 ] : null;
}

Class.prototype.get_privacy = function( comment ){
  var result = this.re.privacy.exec( comment );
  return result ? result[ 1 ] : '';
}

Class.prototype._get_line_index_by_tag = function( array, tag ){
  for (var i = 0, ln_i = array.length; i < ln_i; i++)
    if( this.re[ tag ].test( array[ i ] ) ) return i;
  return i;
}