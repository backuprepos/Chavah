﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace BitShuva.Models
{
    public class LikeDislikeCount
    {
        /// <summary>
        /// The name of the artist, album, or other category.
        /// </summary>
        public string Name { get; set; }
                
        /// <summary>
        /// The number of likes for the name.
        /// </summary>
        public int LikeCount { get; set; }

        /// <summary>
        /// The number of dislikes for the name.
        /// </summary>
        public int DislikeCount { get; set; }
    }
}